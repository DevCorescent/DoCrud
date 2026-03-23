'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { DocumentTemplate, DocumentField } from '../types/document';
import { FileText, Download, Mail, LogOut, Menu, X, Settings, History, Eye } from 'lucide-react';
import AdminPanel from './AdminPanel';

export default function DocumentGenerator() {
  const { data: session, status } = useSession();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [generatedHtml, setGeneratedHtml] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailData, setEmailData] = useState({ to: '', subject: '', message: '' });
  const [history, setHistory] = useState<any[]>([]);

  const userPermissions = session?.user?.permissions || [];
  const allowedTemplates = templates.filter(template =>
    userPermissions.includes('all') || userPermissions.includes(template.id)
  );

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTemplates();
      fetchHistory();
    }
  }, [status]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/history');
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handleTemplateSelect = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setFormData({});
    setGeneratedHtml('');
    setSidebarOpen(false);
  };

  const generateDocument = () => {
    if (!selectedTemplate) return;

    let html = selectedTemplate.template;
    const data: Record<string, string> = {};

    selectedTemplate.fields.forEach(field => {
      const value = formData[field.name] || '';
      data[field.name] = value;
      html = html.replace(new RegExp(`{{${field.name}}}`, 'g'), value);
    });

    setGeneratedHtml(html);

    // Save to history
    saveToHistory(selectedTemplate, data);
  };

  const saveToHistory = async (template: DocumentTemplate, data: Record<string, string>) => {
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          templateName: template.name,
          data,
          generatedBy: session?.user?.email,
        }),
      });
      fetchHistory();
    } catch (error) {
      console.error('Error saving to history:', error);
    }
  };

  const generatePDF = async () => {
    if (!selectedTemplate || !generatedHtml) return;

    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: generatedHtml,
          data: formData,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedTemplate.name.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const sendEmail = async () => {
    if (!selectedTemplate || !generatedHtml) return;

    try {
      // First generate PDF
      const pdfResponse = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: generatedHtml,
          data: formData,
        }),
      });

      if (pdfResponse.ok) {
        const pdfBuffer = await pdfResponse.arrayBuffer();

        const emailResponse = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: emailData.to,
            subject: emailData.subject,
            text: emailData.message,
            attachment: Array.from(new Uint8Array(pdfBuffer)),
          }),
        });

        if (emailResponse.ok) {
          alert('Email sent successfully!');
          setEmailDialogOpen(false);
          setEmailData({ to: '', subject: '', message: '' });
        }
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email');
    }
  };

  const renderField = (field: DocumentField) => {
    const value = formData[field.name] || '';

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            key={field.id}
            value={value}
            onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            required={field.required}
            rows={4}
          />
        );
      case 'select':
        return (
          <Select
            key={field.id}
            value={value}
            onValueChange={(value) => setFormData(prev => ({ ...prev, [field.name]: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return (
          <Input
            key={field.id}
            type={field.type}
            value={value}
            onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            required={field.required}
          />
        );
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu className="h-6 w-6" />
              </Button>
              <h1 className="text-xl font-semibold text-gray-900 ml-2 md:ml-0">
                Document Generator
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {session?.user?.name}
              </span>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-0`}>
          <div className="flex items-center justify-between p-4 border-b md:hidden">
            <h2 className="text-lg font-semibold">Menu</h2>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6" />
            </Button>
          </div>

          <nav className="p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical">
              <TabsList className="grid w-full grid-cols-1 h-auto">
                <TabsTrigger value="generate" className="justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Documents
                </TabsTrigger>
                <TabsTrigger value="history" className="justify-start">
                  <History className="w-4 h-4 mr-2" />
                  History
                </TabsTrigger>
                {session?.user?.role === 'admin' && (
                  <TabsTrigger value="admin" className="justify-start">
                    <Settings className="w-4 h-4 mr-2" />
                    Admin Panel
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>

            {activeTab === 'generate' && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Available Templates</h3>
                <div className="space-y-2">
                  {allowedTemplates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedTemplate?.id === template.id
                          ? 'bg-blue-100 text-blue-900'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="generate" className="space-y-6">
              {selectedTemplate ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Form */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{selectedTemplate.name}</CardTitle>
                      {selectedTemplate.description && (
                        <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedTemplate.fields.map(field => (
                        <div key={field.id}>
                          <label className="block text-sm font-medium mb-1">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </label>
                          {renderField(field)}
                        </div>
                      ))}
                      <div className="flex space-x-2 pt-4">
                        <Button onClick={generateDocument} className="flex-1">
                          <Eye className="w-4 h-4 mr-2" />
                          Generate Preview
                        </Button>
                        {generatedHtml && (
                          <>
                            <Button variant="outline" onClick={generatePDF}>
                              <Download className="w-4 h-4 mr-2" />
                              Download PDF
                            </Button>
                            <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                              <DialogTrigger asChild>
                                <Button variant="outline">
                                  <Mail className="w-4 h-4 mr-2" />
                                  Send Email
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Send Document via Email</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Recipient Email</label>
                                    <Input
                                      type="email"
                                      value={emailData.to}
                                      onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                                      placeholder="recipient@example.com"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Subject</label>
                                    <Input
                                      value={emailData.subject}
                                      onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                                      placeholder="Document Subject"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium mb-1">Message</label>
                                    <Textarea
                                      value={emailData.message}
                                      onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                                      placeholder="Additional message..."
                                      rows={3}
                                    />
                                  </div>
                                  <div className="flex justify-end space-x-2">
                                    <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                                      Cancel
                                    </Button>
                                    <Button onClick={sendEmail}>
                                      Send Email
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Preview */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {generatedHtml ? (
                        <div
                          className="prose max-w-none border rounded p-4 bg-white min-h-[400px]"
                          dangerouslySetInnerHTML={{ __html: generatedHtml }}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-64 text-muted-foreground">
                          <div className="text-center">
                            <FileText className="w-12 h-12 mx-auto mb-4" />
                            <p>Fill out the form and click &quot;Generate Preview&quot; to see the document</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h2 className="text-2xl font-bold mb-2">Select a Template</h2>
                    <p className="text-muted-foreground">Choose a template from the sidebar to get started</p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Document History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {history.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4 border rounded">
                        <div>
                          <h3 className="font-medium">{item.templateName}</h3>
                          <p className="text-sm text-muted-foreground">
                            Generated on {new Date(item.generatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {session?.user?.role === 'admin' && (
              <TabsContent value="admin">
                <AdminPanel />
              </TabsContent>
            )}
          </Tabs>
        </main>
      </div>
    </div>
  );
}
