'use client';

import type { VehicleBlacklistRecord, VehicleStatusMetadata } from '@/features/vehicle/blacklist';
import { VehicleBlacklistDetailDialog } from './VehicleBlacklistDetailDialog';
import { VehicleBlacklistEditDialog } from './VehicleBlacklistEditDialog';
import { VehicleBlacklistRemoveDialog } from './VehicleBlacklistRemoveDialog';

type VehicleBlacklistDialogsProps = {
  detail: VehicleBlacklistRecord | null;
  editing: VehicleBlacklistRecord | null;
  removing: VehicleBlacklistRecord | null;
  isSaving: boolean;
  onCloseDetail: () => void;
  onCloseEdit: () => void;
  onCloseRemove: () => void;
  onSaveEdit: (record: VehicleBlacklistRecord, metadata: VehicleStatusMetadata) => Promise<void>;
  onConfirmRemove: (record: VehicleBlacklistRecord) => Promise<void>;
};

export function VehicleBlacklistDialogs({
  detail,
  editing,
  removing,
  isSaving,
  onCloseDetail,
  onCloseEdit,
  onCloseRemove,
  onSaveEdit,
  onConfirmRemove,
}: VehicleBlacklistDialogsProps) {
  return (
    <>
      {detail ? <VehicleBlacklistDetailDialog record={detail} onClose={onCloseDetail} /> : null}
      {editing ? <VehicleBlacklistEditDialog key={editing.id} record={editing} isSaving={isSaving} onClose={onCloseEdit} onSave={onSaveEdit} /> : null}
      {removing ? <VehicleBlacklistRemoveDialog key={removing.id} record={removing} isSaving={isSaving} onClose={onCloseRemove} onConfirm={onConfirmRemove} /> : null}
    </>
  );
}
