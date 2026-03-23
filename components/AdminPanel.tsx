'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, DocumentTemplate } from '@/types/document';
import { Plus, Edit, Trash2, Users, FileText, Shield } from 'lucide-react';
import TemplateEditor from './TemplateEditor';

export default function AdminPanel() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'user' as 'admin' | 'hr' | 'legal' | 'user',
    permissions: [] as string[],
  });

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchTemplates();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

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

  const handleCreateUser = async () => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...userForm,
          isActive: true,
        }),
      });

      if (response.ok) {
        setShowUserDialog(false);
        setUserForm({ name: '', email: '', role: 'user', permissions: [] });
        fetchUsers();
      }
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handleUpdateUser = async (user: User) => {
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleSaveTemplate = async (template: DocumentTemplate) => {
    try {
      const method = template.id.startsWith('custom-') && templates.find(t => t.id === template.id) ? 'PUT' : 'POST';
      const response = await fetch('/api/templates/manage', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      });

      if (response.ok) {
        setShowTemplateEditor(false);
        setEditingTemplate(null);
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/templates/manage?id=${templateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const getRolePermissions = (role: string) => {
    const rolePermissions: Record<string, string[]> = {
      admin: ['all'],
      hr: ['appointment-letter', 'offer-letter', 'termination-letter', 'resignation-letter', 'performance-appraisal'],
      legal: ['nda', 'employment-contract', 'loan-agreement', 'service-agreement', 'partnership-agreement'],
      user: [],
    };
    return rolePermissions[role] || [];
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You need admin privileges to access this panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
        <p className="text-muted-foreground">Manage users and templates</p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Template Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Users</h2>
            <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <Input
                      value={userForm.name}
                      onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter user name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <Input
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Role</label>
                    <Select
                      value={userForm.role}
                      onValueChange={(value: any) => setUserForm(prev => ({
                        ...prev,
                        role: value,
                        permissions: getRolePermissions(value)
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="hr">HR</SelectItem>
                        <SelectItem value="legal">Legal</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowUserDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateUser}>
                      Create User
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {users.map(user => (
              <Card key={user.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold">{user.name}</h3>
                      <p className="text-muted-foreground">{user.email}</p>
                      <p className="text-sm">Role: <span className="capitalize font-medium">{user.role}</span></p>
                      <p className="text-sm">Status: <span className={user.isActive ? 'text-green-600' : 'text-red-600'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span></p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingUser(user);
                          setUserForm({
                            name: user.name,
                            email: user.email,
                            role: user.role,
                            permissions: user.permissions,
                          });
                          setShowUserDialog(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Templates</h2>
            <Button onClick={() => {
              setEditingTemplate(null);
              setShowTemplateEditor(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </div>

          <div className="grid gap-4">
            {templates.filter(t => t.isCustom).map(template => (
              <Card key={template.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold">{template.name}</h3>
                      <p className="text-muted-foreground">{template.description}</p>
                      <p className="text-sm">Category: {template.category}</p>
                      <p className="text-sm">Fields: {template.fields.length}</p>
                      <p className="text-sm">Version: {template.version}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingTemplate(template);
                          setShowTemplateEditor(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {showTemplateEditor && (
        <TemplateEditor
          template={editingTemplate || undefined}
          onSave={handleSaveTemplate}
          onClose={() => {
            setShowTemplateEditor(false);
            setEditingTemplate(null);
          }}
        />
      )}
    </div>
  );
}