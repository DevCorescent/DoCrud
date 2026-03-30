import { dropdownOptionsPath, readJsonFile, writeJsonFile } from '@/lib/server/storage';

export type DropdownOptionMap = Record<string, string[]>;

function normalizeOptions(options: DropdownOptionMap) {
  return Object.fromEntries(
    Object.entries(options).map(([key, values]) => [
      key,
      Array.from(new Set((Array.isArray(values) ? values : []).map((value) => String(value).trim()).filter(Boolean))).sort((left, right) =>
        left.localeCompare(right),
      ),
    ]),
  );
}

export async function getDropdownOptions() {
  return normalizeOptions(await readJsonFile<DropdownOptionMap>(dropdownOptionsPath, {}));
}

export async function saveDropdownOptions(options: DropdownOptionMap) {
  await writeJsonFile(dropdownOptionsPath, normalizeOptions(options));
}

export async function addDropdownOption(fieldKey: string, option: string) {
  const options = await getDropdownOptions();
  const next = normalizeOptions({
    ...options,
    [fieldKey]: [...(options[fieldKey] || []), option],
  });
  await saveDropdownOptions(next);
  return next;
}
