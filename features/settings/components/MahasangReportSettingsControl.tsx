'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  BadgeCheck,
  CarFront,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { fetchMemberVehicleDetails } from '@/features/members/api/member-vehicle.api';
import {
  normalizeVehicleTypeList,
  resolveDefaultMahasangVehicleTypes,
  type MahasangReportSettings,
  type MahasangVehicleTypeGroup,
} from '@/features/settings/api/mahasang-report-settings.api';
import { useMahasangReportSettings } from '@/features/settings/hooks/useMahasangReportSettings';
import { useVehicleTypes } from '@/features/vehicle/type/hooks/useVehicleTypes';
import { vehicleResourceKeys } from '@/lib/query/query-keys';
import { toNepaliDigits } from '@/utils/numbers';

const MANUAL_DEFAULT_MODE = '__manual__';
const ALL_DEFAULT_MODE = '__all__';
const PREVIEW_CHIP_LIMIT = 6;

type PickerModalState =
  | { mode: 'manual' }
  | { mode: 'create-group' }
  | { mode: 'edit-group'; groupId: string };

type ModalFilterTab = 'all' | 'selected' | 'unselected';

export function MahasangReportSettingsControl() {
  const { toast } = useToast();
  const settingsQuery = useMahasangReportSettings();
  const vehicleTypesQuery = useVehicleTypes();
  const memberVehiclesQuery = useQuery({
    queryKey: vehicleResourceKeys.memberVehicleList('mahasang-settings'),
    queryFn: ({ signal }) => fetchMemberVehicleDetails(signal),
    gcTime: 30 * 60 * 1000,
  });

  const [draft, setDraft] = useState<MahasangReportSettings | null>(null);
  const [pickerModal, setPickerModal] = useState<PickerModalState | null>(null);
  const [modalGroupName, setModalGroupName] = useState('');
  const [modalSelected, setModalSelected] = useState<string[]>([]);
  const [modalMakeDefault, setModalMakeDefault] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [modalTab, setModalTab] = useState<ModalFilterTab>('all');
  const [modalError, setModalError] = useState<string | null>(null);

  const settings = draft ?? settingsQuery.settings;

  const availableVehicleTypes = useMemo(() => {
    const collected: string[] = [];
    for (const record of vehicleTypesQuery.records) {
      for (const vehicleType of record.vehicleTypes) {
        collected.push(vehicleType);
      }
    }
    for (const vehicle of memberVehiclesQuery.data ?? []) {
      if (vehicle.tqmsVehicleType && vehicle.tqmsVehicleType !== 'सवारी प्रकार उपलब्ध छैन') {
        collected.push(vehicle.tqmsVehicleType);
      }
    }
    for (const group of settings?.vehicleTypeGroups ?? []) {
      for (const vehicleType of group.vehicleTypes) {
        collected.push(vehicleType);
      }
    }
    for (const vehicleType of settings?.defaultVehicleTypes ?? []) {
      collected.push(vehicleType);
    }
    return normalizeVehicleTypeList(collected).sort((left, right) => left.localeCompare(right, 'ne'));
  }, [memberVehiclesQuery.data, settings?.defaultVehicleTypes, settings?.vehicleTypeGroups, vehicleTypesQuery.records]);

  const activeDefaultGroup = useMemo(() => {
    if (!settings?.defaultGroupId) return null;
    return settings.vehicleTypeGroups.find((group) => group.id === settings.defaultGroupId) ?? null;
  }, [settings]);

  const activeDefaultTypes = useMemo(() => {
    if (!settings) return [];
    return resolveDefaultMahasangVehicleTypes(settings);
  }, [settings]);

  const defaultModeValue = useMemo(() => {
    if (!settings) return ALL_DEFAULT_MODE;
    if (settings.defaultGroupId) return settings.defaultGroupId;
    if (settings.defaultVehicleTypes.length > 0) return MANUAL_DEFAULT_MODE;
    return ALL_DEFAULT_MODE;
  }, [settings]);

  const statusBadgeText = useMemo(() => {
    if (!settings) return '';
    if (activeDefaultGroup) {
      return `डिफल्ट: ${activeDefaultGroup.name} (${toNepaliDigits(activeDefaultGroup.vehicleTypes.length)})`;
    }
    if (settings.defaultVehicleTypes.length > 0) {
      return `डिफल्ट: ${toNepaliDigits(settings.defaultVehicleTypes.length)} प्रकार`;
    }
    return 'डिफल्ट: सबै प्रकार';
  }, [activeDefaultGroup, settings]);

  const isChanged = Boolean(
    settings && settingsQuery.settings && JSON.stringify(settings) !== JSON.stringify(settingsQuery.settings),
  );

  const updateDraft = (updater: (current: MahasangReportSettings) => MahasangReportSettings) => {
    const base = draft ?? settingsQuery.settings;
    if (!base) return;
    setDraft(updater(base));
  };

  const openPickerModal = (target: PickerModalState) => {
    if (!settings) return;
    setModalSearch('');
    setModalTab('all');
    setModalError(null);

    if (target.mode === 'manual') {
      setModalGroupName('');
      setModalSelected([...settings.defaultVehicleTypes]);
      setModalMakeDefault(true);
      setPickerModal(target);
      return;
    }

    if (target.mode === 'create-group') {
      setModalGroupName('');
      setModalSelected([]);
      setModalMakeDefault(!settings.defaultGroupId);
      setPickerModal(target);
      return;
    }

    const group = settings.vehicleTypeGroups.find((item) => item.id === target.groupId);
    if (!group) return;
    setModalGroupName(group.name);
    setModalSelected([...group.vehicleTypes]);
    setModalMakeDefault(settings.defaultGroupId === group.id);
    setPickerModal(target);
  };

  const handleDefaultModeChange = (value: string) => {
    if (value === ALL_DEFAULT_MODE) {
      updateDraft((current) => ({ ...current, defaultGroupId: '', defaultVehicleTypes: [] }));
      return;
    }
    if (value === MANUAL_DEFAULT_MODE) {
      updateDraft((current) => ({ ...current, defaultGroupId: '' }));
      if (settings && settings.defaultVehicleTypes.length === 0) {
        openPickerModal({ mode: 'manual' });
      }
      return;
    }
    updateDraft((current) => ({ ...current, defaultGroupId: value }));
  };

  const handleDeleteGroup = (groupId: string) => {
    updateDraft((current) => ({
      ...current,
      defaultGroupId: current.defaultGroupId === groupId ? '' : current.defaultGroupId,
      vehicleTypeGroups: current.vehicleTypeGroups.filter((group) => group.id !== groupId),
    }));
    if (pickerModal?.mode === 'edit-group' && pickerModal.groupId === groupId) {
      setPickerModal(null);
    }
  };

  const modalSelectedSet = useMemo(
    () => new Set(modalSelected.map((item) => item.trim().toLocaleLowerCase())),
    [modalSelected],
  );

  const searchFilteredTypes = useMemo(() => {
    const query = modalSearch.trim().toLocaleLowerCase();
    if (!query) return availableVehicleTypes;
    return availableVehicleTypes.filter((item) => item.toLocaleLowerCase().includes(query));
  }, [availableVehicleTypes, modalSearch]);

  const modalVisibleTypes = useMemo(() => {
    if (modalTab === 'selected') {
      return searchFilteredTypes.filter((item) => modalSelectedSet.has(item.trim().toLocaleLowerCase()));
    }
    if (modalTab === 'unselected') {
      return searchFilteredTypes.filter((item) => !modalSelectedSet.has(item.trim().toLocaleLowerCase()));
    }
    return searchFilteredTypes;
  }, [modalSelectedSet, modalTab, searchFilteredTypes]);

  const toggleModalVehicleType = (vehicleType: string, checked: boolean) => {
    const key = vehicleType.trim().toLocaleLowerCase();
    setModalSelected((current) =>
      checked
        ? normalizeVehicleTypeList([...current, vehicleType])
        : current.filter((item) => item.trim().toLocaleLowerCase() !== key),
    );
  };

  const toggleModalCategoryPreset = (categoryVehicleTypes: string[]) => {
    const normalizedCategory = normalizeVehicleTypeList(categoryVehicleTypes);
    const allSelected = normalizedCategory.length > 0 && normalizedCategory.every((item) =>
      modalSelectedSet.has(item.trim().toLocaleLowerCase()),
    );
    if (allSelected) {
      const categoryKeys = new Set(normalizedCategory.map((item) => item.trim().toLocaleLowerCase()));
      setModalSelected((current) =>
        current.filter((item) => !categoryKeys.has(item.trim().toLocaleLowerCase())),
      );
      return;
    }
    setModalSelected((current) => normalizeVehicleTypeList([...current, ...normalizedCategory]));
  };

  const handleSelectVisibleInModal = () => {
    if (modalSearch.trim()) {
      setModalSelected((current) => normalizeVehicleTypeList([...current, ...searchFilteredTypes]));
      return;
    }
    setModalSelected(normalizeVehicleTypeList(availableVehicleTypes));
  };

  const applyPickerModal = () => {
    if (!pickerModal || !settings) return;
    const normalizedSelection = normalizeVehicleTypeList(modalSelected);

    if (pickerModal.mode === 'manual') {
      updateDraft((current) => ({
        ...current,
        defaultGroupId: '',
        defaultVehicleTypes: normalizedSelection,
      }));
      setPickerModal(null);
      return;
    }

    const trimmedName = modalGroupName.trim();
    if (!trimmedName) {
      setModalError('समूहको नाम अनिवार्य छ।');
      return;
    }

    const duplicate = settings.vehicleTypeGroups.some((group) => {
      if (pickerModal.mode === 'edit-group' && group.id === pickerModal.groupId) {
        return false;
      }
      return group.name.trim().toLocaleLowerCase() === trimmedName.toLocaleLowerCase();
    });

    if (duplicate) {
      setModalError(`"${trimmedName}" नामको समूह पहिले नै छ।`);
      return;
    }

    if (pickerModal.mode === 'create-group') {
      const id = `group-${Date.now().toString(36)}`;
      const nextGroup: MahasangVehicleTypeGroup = {
        id,
        name: trimmedName,
        vehicleTypes: normalizedSelection,
      };
      updateDraft((current) => ({
        ...current,
        vehicleTypeGroups: [...current.vehicleTypeGroups, nextGroup],
        defaultGroupId: modalMakeDefault ? id : current.defaultGroupId,
      }));
      setPickerModal(null);
      return;
    }

    const targetGroupId = pickerModal.groupId;
    updateDraft((current) => ({
      ...current,
      vehicleTypeGroups: current.vehicleTypeGroups.map((group) =>
        group.id === targetGroupId
          ? { ...group, name: trimmedName, vehicleTypes: normalizedSelection }
          : group,
      ),
      defaultGroupId: modalMakeDefault
        ? targetGroupId
        : current.defaultGroupId === targetGroupId
          ? ''
          : current.defaultGroupId,
    }));
    setPickerModal(null);
  };

  const save = async () => {
    if (!settings) return;
    try {
      await settingsQuery.save(settings);
      setDraft(null);
      toast({ title: 'महासंघ रिपोर्ट सवारी प्रकार समूह सुरक्षित भयो।' });
    } catch (cause) {
      toast({
        title: 'सेटिङ सुरक्षित गर्न सकिएन।',
        description: cause instanceof Error ? cause.message : 'कृपया पुनः प्रयास गर्नुहोस्।',
        variant: 'destructive',
      });
    }
  };

  const isLoading = settingsQuery.isLoading || vehicleTypesQuery.isLoading;
  const loadError = settingsQuery.error || vehicleTypesQuery.loadError;
  const previewTypes = activeDefaultTypes.slice(0, PREVIEW_CHIP_LIMIT);
  const overflowCount = Math.max(0, activeDefaultTypes.length - PREVIEW_CHIP_LIMIT);
  const unselectedCount = Math.max(0, availableVehicleTypes.length - modalSelected.length);

  const primaryPickerLabel = activeDefaultGroup
    ? `सवारी प्रकार सम्पादन (${toNepaliDigits(activeDefaultGroup.vehicleTypes.length)})`
    : settings && settings.defaultVehicleTypes.length > 0
      ? `सवारी प्रकार छान्नुहोस् (${toNepaliDigits(settings.defaultVehicleTypes.length)})`
      : 'सवारी प्रकार छान्नुहोस्';

  const openPrimaryPicker = () => {
    if (activeDefaultGroup) {
      openPickerModal({ mode: 'edit-group', groupId: activeDefaultGroup.id });
      return;
    }
    openPickerModal({ mode: 'manual' });
  };

  return (
    <Card className="space-y-4 rounded-lg border-border/80 p-4 shadow-sm sm:p-5">
      <header className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <CarFront className="size-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">महासंघ रिपोर्ट सवारी प्रकार</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            महासंघ रिपोर्ट खोल्दा डिफल्ट रूपमा छानिने सवारी प्रकार वा समूह व्यवस्थापन गर्नुहोस्।
          </p>
        </div>
        {settings ? (
          <Badge variant="secondary" className="shrink-0 gap-1 text-[10px]">
            <BadgeCheck className="size-3" aria-hidden="true" />
            {statusBadgeText}
          </Badge>
        ) : null}
      </header>

      {loadError ? (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">{loadError}</span>
          <Button
            type="button"
            size="xs"
            variant="link"
            className="h-auto shrink-0 p-0"
            onClick={() => {
              void settingsQuery.reload();
              void vehicleTypesQuery.reload();
            }}
          >
            पुनः प्रयास
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <p role="status" className="py-3 text-center text-xs text-muted-foreground">
          महासंघ रिपोर्ट सवारी प्रकार सेटिङ लोड हुँदैछ...
        </p>
      ) : settings ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1.5">
              <label htmlFor="mahasang-default-mode" className="text-xs font-medium text-foreground">
                रिपोर्टको डिफल्ट चयन
              </label>
              <Select value={defaultModeValue} onValueChange={handleDefaultModeChange}>
                <SelectTrigger id="mahasang-default-mode" className="h-9 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_DEFAULT_MODE}>सबै सवारी प्रकार (फिल्टर बिना)</SelectItem>
                  {settings.vehicleTypeGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      समूह: {group.name} ({toNepaliDigits(group.vehicleTypes.length)} प्रकार)
                    </SelectItem>
                  ))}
                  <SelectItem value={MANUAL_DEFAULT_MODE}>
                    कस्टम सूची ({toNepaliDigits(settings.defaultVehicleTypes.length)} प्रकार)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 gap-1.5"
                onClick={openPrimaryPicker}
              >
                <SlidersHorizontal className="size-3.5" aria-hidden="true" />
                {primaryPickerLabel}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 gap-1.5"
                onClick={() => openPickerModal({ mode: 'create-group' })}
              >
                <Plus className="size-3.5" aria-hidden="true" />
                नयाँ समूह
              </Button>
            </div>
          </div>

          {activeDefaultTypes.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border/70 bg-muted/20 px-3 py-2">
              {previewTypes.map((vehicleType) => (
                <Badge key={vehicleType} variant="secondary" className="text-[11px] font-normal">
                  {vehicleType}
                </Badge>
              ))}
              {overflowCount > 0 ? (
                <Badge variant="outline" className="text-[11px]">
                  +{toNepaliDigits(overflowCount)} थप
                </Badge>
              ) : null}
            </div>
          ) : null}

          {settings.vehicleTypeGroups.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">समूहहरू:</span>
              {settings.vehicleTypeGroups.map((group) => {
                const isDefault = settings.defaultGroupId === group.id;
                return (
                  <div
                    key={group.id}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs"
                  >
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary"
                      onClick={() => openPickerModal({ mode: 'edit-group', groupId: group.id })}
                    >
                      <span>{group.name}</span>
                      <span className="text-muted-foreground">({toNepaliDigits(group.vehicleTypes.length)})</span>
                      {isDefault ? (
                        <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-[10px]">
                          डिफल्ट
                        </Badge>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      aria-label={`${group.name} सम्पादन गर्नुहोस्`}
                      className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => openPickerModal({ mode: 'edit-group', groupId: group.id })}
                    >
                      <Pencil className="size-3" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`${group.name} हटाउनुहोस्`}
                      className="rounded p-0.5 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteGroup(group.id)}
                    >
                      <Trash2 className="size-3" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
            {isChanged ? (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                असुरक्षित परिवर्तन बाँकी छ।
              </span>
            ) : <span />}
            <div className="flex flex-wrap items-center gap-2">
              {isChanged ? (
                <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>
                  परिवर्तन रद्द गर्नुहोस्
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                disabled={!isChanged || settingsQuery.isSaving}
                onClick={() => void save()}
              >
                {settingsQuery.isSaving ? 'सुरक्षित हुँदैछ...' : 'सेटिङ सुरक्षित गर्नुहोस्'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={Boolean(pickerModal)} onOpenChange={(open) => { if (!open) setPickerModal(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {pickerModal?.mode === 'create-group'
                ? 'नयाँ सवारी प्रकार समूह बनाउनुहोस्'
                : pickerModal?.mode === 'edit-group'
                  ? 'सवारी प्रकार समूह सम्पादन गर्नुहोस्'
                  : 'कस्टम डिफल्ट सवारी प्रकार छान्नुहोस्'}
            </DialogTitle>
            <DialogDescription>
              यहाँ छानिएका सवारी प्रकारहरू महासंघ रिपोर्टको डिफल्ट सेटिङमा लागू हुनेछन्।
            </DialogDescription>
          </DialogHeader>

          {pickerModal && pickerModal.mode !== 'manual' ? (
            <div className="space-y-1.5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-1">
                  <label htmlFor="mahasang-modal-group-name" className="text-xs font-medium text-foreground">
                    समूहको नाम
                  </label>
                  <Input
                    id="mahasang-modal-group-name"
                    value={modalGroupName}
                    onChange={(event) => {
                      setModalGroupName(event.target.value);
                      if (modalError) setModalError(null);
                    }}
                    placeholder="जस्तै: महासंघ मुख्य सवारी समूह"
                    className="h-9 text-xs"
                  />
                </div>
                <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border/70 px-3 text-xs">
                  <Checkbox
                    checked={modalMakeDefault}
                    onCheckedChange={(checked) => setModalMakeDefault(checked === true)}
                  />
                  <span>यसलाई डिफल्ट बनाउनुहोस्</span>
                </label>
              </div>
              {modalError ? <p className="text-xs text-destructive">{modalError}</p> : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={modalSearch}
                onChange={(event) => setModalSearch(event.target.value)}
                placeholder="सवारी साधन प्रकार खोज्नुहोस्..."
                aria-label="सवारी साधन प्रकार खोज्नुहोस्"
                className="h-8 pl-8 pr-8 text-xs"
              />
              {modalSearch ? (
                <button
                  type="button"
                  aria-label="खोज हटाउनुहोस्"
                  onClick={() => setModalSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-1 rounded-md border border-border/70 bg-muted/20 p-0.5">
              <Button
                type="button"
                size="xs"
                variant={modalTab === 'all' ? 'secondary' : 'ghost'}
                onClick={() => setModalTab('all')}
              >
                सबै ({toNepaliDigits(availableVehicleTypes.length)})
              </Button>
              <Button
                type="button"
                size="xs"
                variant={modalTab === 'selected' ? 'secondary' : 'ghost'}
                onClick={() => setModalTab('selected')}
              >
                छानिएका ({toNepaliDigits(modalSelected.length)})
              </Button>
              <Button
                type="button"
                size="xs"
                variant={modalTab === 'unselected' ? 'secondary' : 'ghost'}
                onClick={() => setModalTab('unselected')}
              >
                नछानिएका ({toNepaliDigits(unselectedCount)})
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            {vehicleTypesQuery.records.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[11px] text-muted-foreground">श्रेणी:</span>
                {vehicleTypesQuery.records.map((category) => {
                  const categorySelected = category.vehicleTypes.length > 0
                    && category.vehicleTypes.every((type) =>
                      modalSelectedSet.has(type.trim().toLocaleLowerCase()),
                    );
                  return (
                    <Button
                      key={category.id}
                      type="button"
                      size="xs"
                      variant={categorySelected ? 'secondary' : 'outline'}
                      onClick={() => toggleModalCategoryPreset(category.vehicleTypes)}
                    >
                      {category.category} ({toNepaliDigits(category.vehicleTypes.length)})
                    </Button>
                  );
                })}
              </div>
            ) : <span />}

            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={handleSelectVisibleInModal}
                disabled={availableVehicleTypes.length === 0 || (Boolean(modalSearch.trim()) && searchFilteredTypes.length === 0)}
              >
                {modalSearch.trim() ? 'देखिएका छान्नुहोस्' : 'सबै छान्नुहोस्'}
              </Button>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={() => setModalSelected([])}
                disabled={modalSelected.length === 0}
              >
                खाली गर्नुहोस्
              </Button>
            </div>
          </div>

          <div className="grid max-h-72 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
            {modalVisibleTypes.length === 0 ? (
              <p className="col-span-full py-6 text-center text-xs text-muted-foreground">
                सवारी साधन प्रकार भेटिएन।
              </p>
            ) : modalVisibleTypes.map((vehicleType) => {
              const checked = modalSelectedSet.has(vehicleType.trim().toLocaleLowerCase());
              return (
                <label
                  key={vehicleType}
                  className={`flex cursor-pointer items-center gap-2 rounded border px-2.5 py-1.5 text-xs ${
                    checked
                      ? 'border-primary/50 bg-primary/5 font-medium text-foreground'
                      : 'border-border/60 hover:bg-muted/40'
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => toggleModalVehicleType(vehicleType, value === true)}
                  />
                  <span className="min-w-0 truncate" title={vehicleType}>{vehicleType}</span>
                </label>
              );
            })}
          </div>

          <DialogFooter className="items-center border-t border-border/70 pt-3">
            <span className="text-xs text-muted-foreground sm:mr-auto">
              छानिएका: {toNepaliDigits(modalSelected.length)} / {toNepaliDigits(availableVehicleTypes.length)} प्रकार
            </span>
            <Button type="button" size="sm" variant="ghost" onClick={() => setPickerModal(null)}>
              रद्द गर्नुहोस्
            </Button>
            <Button type="button" size="sm" onClick={applyPickerModal}>
              {pickerModal?.mode === 'create-group' ? 'समूह थप्नुहोस्' : 'लागू गर्नुहोस्'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
