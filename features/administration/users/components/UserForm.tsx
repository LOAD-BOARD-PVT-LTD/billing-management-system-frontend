'use client';

import { useState, type FormEvent } from 'react';
import { ShieldCheck, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { BranchRecord } from '@/features/administration/branches/types/branch.types';
import { Role } from '@/types/auth';
import { userFormSchema, userUpdateSchema } from '../schemas/user.schema';
import type { UserFields, UserRecord, UserUpdateFields } from '../types/user.types';
import { t } from '@/utils/translations';

type UserFormValues = UserFields & { confirmPassword: string };
type UserFormField = keyof UserFormValues;
type UserFormErrors = Partial<Record<UserFormField, string>>;

const EMPTY_USER: UserFormValues = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: Role.User,
  branchId: '',
  status: 'Active',
};

function errorsFromIssues(issues: Array<{ path: PropertyKey[]; message: string }>): UserFormErrors {
  return issues.reduce<UserFormErrors>((errors, issue) => {
    const field = issue.path[0];
    if (typeof field === 'string' && field in EMPTY_USER && !errors[field as UserFormField]) {
      errors[field as UserFormField] = issue.message;
    }
    return errors;
  }, {});
}

export function UserForm({
  user,
  isSaving,
  branches,
  isLoadingBranches,
  branchesError,
  onSubmit,
  onUpdate,
  onCancel,
}: {
  user?: UserRecord;
  isSaving: boolean;
  branches: BranchRecord[];
  isLoadingBranches: boolean;
  branchesError: string | null;
  onSubmit: (fields: UserFields) => Promise<void>;
  onUpdate?: (fields: UserUpdateFields) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<UserFormValues>(() => {
    if (!user) return EMPTY_USER;
    const knownRole = [Role.Admin, Role.User, Role.Operator].find((role) => role === user.role.toLowerCase());
    return {
      ...EMPTY_USER,
      name: user.name,
      email: user.email,
      role: knownRole ?? user.role as UserFields['role'],
      branchId: user.branchId ?? '',
      status: user.status?.toLowerCase() === 'inactive' ? 'Inactive' : 'Active',
    };
  });
  const [errors, setErrors] = useState<UserFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const availableBranches = branches.filter((branch) => (
    branch.status === 'ACTIVE' || branch.id === user?.branchId
  ));
  const roleOptions = [
    { value: Role.Admin, label: t('roles.admin') },
    { value: Role.User, label: t('roles.operator') },
    { value: Role.Operator, label: 'Operator' },
  ];

  const update = <K extends UserFormField>(key: K, value: UserFormValues[K]) => {
    const next = { ...form, [key]: value };
    setForm(next);
    setSubmitError(null);
    if (hasSubmitted) {
      const result = user ? userUpdateSchema.safeParse(next) : userFormSchema.safeParse(next);
      setErrors(errorsFromIssues(result.success ? [] : result.error.issues));
    } else {
      setErrors((current) => ({ ...current, [key]: undefined }));
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSubmitted(true);
    setSubmitError(null);
    try {
      if (user) {
        const result = userUpdateSchema.safeParse(form);
        if (!result.success) {
          const nextErrors = errorsFromIssues(result.error.issues);
          setErrors(nextErrors);
          if (nextErrors.role || nextErrors.branchId || nextErrors.status) setActiveTab('access');
          else setActiveTab('profile');
          return;
        }
        if (!onUpdate) throw new Error('User update is not available.');
        await onUpdate({
          name: result.data.name,
          email: result.data.email,
          ...(result.data.password ? { password: result.data.password } : {}),
          role: result.data.role,
          branchId: result.data.branchId,
          status: result.data.status,
        });
      } else {
        const result = userFormSchema.safeParse(form);
        if (!result.success) {
          const nextErrors = errorsFromIssues(result.error.issues);
          setErrors(nextErrors);
          if (nextErrors.role || nextErrors.branchId || nextErrors.status) setActiveTab('access');
          else setActiveTab('profile');
          return;
        }
        await onSubmit({
          name: result.data.name,
          email: result.data.email,
          password: result.data.password,
          role: result.data.role,
          branchId: result.data.branchId,
          status: result.data.status,
        });
      }
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : t(user ? 'users.updateFailed' : 'users.createFailed'));
    }
  };

  const fieldError = (field: UserFormField) => errors[field]
    ? <p id={`user-${field}-error`} className="text-xs text-destructive">{errors[field]}</p>
    : null;
  const canSubmit = !isSaving && !isLoadingBranches && !branchesError && availableBranches.length > 0;

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b border-border bg-transparent p-0">
            <TabsTrigger value="profile" className="gap-2 rounded-b-none px-4 py-2.5 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">
              <UserRound className="h-4 w-4" aria-hidden="true" />{t('users.tabs.profile')}
            </TabsTrigger>
            <TabsTrigger value="access" className="gap-2 rounded-b-none px-4 py-2.5 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />{t('users.tabs.access')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4 rounded-xl border border-border/80 bg-card p-4 sm:p-5">
            <div className="mb-5 border-b border-border/70 pb-4">
              <h2 className="text-sm font-semibold">{t('users.profilePanelTitle')}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {user ? t('users.passwordUpdateHint') : 'प्रयोगकर्ताको नाम, इमेल र लगइन पासवर्ड राख्नुहोस्।'}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="user-email">{t('users.fields.email')}</Label>
                <Input
                  id="user-email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  value={form.email}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'user-email-error' : undefined}
                  onChange={(event) => update('email', event.target.value)}
                />
                {fieldError('email')}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-name">{t('users.fields.name')}</Label>
                <Input
                  id="user-name"
                  autoComplete="name"
                  maxLength={100}
                  value={form.name}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'user-name-error' : undefined}
                  onChange={(event) => update('name', event.target.value)}
                />
                {fieldError('name')}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-password">{user ? t('users.newPassword') : t('users.fields.password')}</Label>
                <Input
                  id="user-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={user && !form.password ? undefined : 8}
                  maxLength={128}
                  placeholder={user ? t('users.passwordUnchanged') : undefined}
                  value={form.password}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'user-password-error' : 'user-password-hint'}
                  onChange={(event) => update('password', event.target.value)}
                />
                {errors.password ? fieldError('password') : <p id="user-password-hint" className="text-xs text-muted-foreground">{user ? t('users.passwordUpdateHint') : t('users.passwordHint')}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-confirm-password">पासवर्ड पुष्टि</Label>
                <Input
                  id="user-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  maxLength={128}
                  value={form.confirmPassword}
                  aria-invalid={Boolean(errors.confirmPassword)}
                  aria-describedby={errors.confirmPassword ? 'user-confirmPassword-error' : undefined}
                  onChange={(event) => update('confirmPassword', event.target.value)}
                />
                {fieldError('confirmPassword')}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="access" className="mt-4 rounded-xl border border-border/80 bg-card p-4 sm:p-5">
            <div className="mb-5 flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold">{t('users.profilePanelTitle')}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{t('users.profilePanelDesc')}</p>
              </div>
              <span className="inline-flex w-fit rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium">
                {roleOptions.find((option) => option.value === form.role)?.label}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="user-role">{t('users.fields.role')}</Label>
                <Select value={form.role} onValueChange={(value) => {
                  const role = roleOptions.find((option) => option.value === value);
                  if (role) update('role', role.value);
                }}>
                  <SelectTrigger id="user-role" aria-invalid={Boolean(errors.role)} aria-describedby={errors.role ? 'user-role-error' : undefined}>
                    <SelectValue placeholder="भूमिका छान्नुहोस्" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {fieldError('role')}
                <p className="text-xs text-muted-foreground">भूमिकाले प्रणालीमा प्रयोगकर्ताको access स्तर निर्धारण गर्छ।</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-branch">{t('users.fields.branch')}</Label>
                <Select value={form.branchId} onValueChange={(value) => update('branchId', value)} disabled={isLoadingBranches || availableBranches.length === 0}>
                  <SelectTrigger id="user-branch" aria-invalid={Boolean(errors.branchId)} aria-describedby={errors.branchId ? 'user-branchId-error' : 'user-branch-hint'}>
                    <SelectValue placeholder={isLoadingBranches ? 'शाखा लोड हुँदैछ...' : t('users.selectBranch')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBranches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>{branch.name} ({branch.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldError('branchId')}
                <p id="user-branch-hint" className="text-xs text-muted-foreground">{t('users.branchHint')}</p>
                {branchesError ? <p role="alert" className="text-xs text-destructive">{branchesError}</p> : null}
                {!isLoadingBranches && !branchesError && availableBranches.length === 0
                  ? <p role="alert" className="text-xs text-destructive">{t('users.noBranches')}</p>
                  : null}
              </div>
              <label htmlFor="user-status" className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-3 sm:col-span-2">
                <Checkbox
                  id="user-status"
                  checked={form.status === 'Active'}
                  onCheckedChange={(checked) => update('status', checked === true ? 'Active' : 'Inactive')}
                />
                <span className="text-sm font-medium">{t('users.fields.isActive')}</span>
              </label>
            </div>
            <p className="mt-4 rounded-lg bg-muted/50 px-3 py-2 text-xs leading-5 text-muted-foreground">
              Admin, User र Operator उपलब्ध प्रणाली roles हुन्। यो फारमले custom permission/API access थप्दैन।
            </p>
          </TabsContent>
        </Tabs>

        {Object.keys(errors).length > 0 && (
          <div role="alert" aria-live="polite" className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <p className="font-medium">{t('users.validation.createBlockedTitle')}</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              {Object.values(errors).filter((message): message is string => Boolean(message)).map((message) => <li key={message}>{message}</li>)}
            </ul>
          </div>
        )}
        {submitError && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {submitError}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="text-xs text-muted-foreground">
          {branchesError ? <p>{t('users.branchLoadFailed')}</p> : null}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            {t('actions.cancel')}
          </Button>
          <Button type="submit" loading={isSaving} disabled={!canSubmit}>
            {t(user ? 'users.update' : 'users.create')}
          </Button>
        </div>
      </div>
    </form>
  );
}
