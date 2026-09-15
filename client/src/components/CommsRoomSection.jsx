import { forwardRef } from 'react';
import EntityTable from './EntityTable.jsx';

const FIELDS = [
  { name: 'location', label: 'Room Location' },
  { name: 'ups_present', label: 'UPS Present', type: 'checkbox' },
  { name: 'ups_model', label: 'UPS Model' },
  { name: 'ups_battery_replace_date', label: 'UPS Battery Replace Date', type: 'date' },
  { name: 'cooling_type', label: 'Cooling Type' },
  { name: 'cooling_condition', label: 'Cooling Condition' },
  {
    name: 'cabling_condition',
    label: 'Cabling Condition',
    type: 'select',
    options: [
      { value: 'good', label: 'Good' },
      { value: 'fair', label: 'Fair' },
      { value: 'poor', label: 'Poor' },
    ],
  },
  { name: 'power_redundancy', label: 'Power Redundancy' },
  {
    name: 'physical_security_description',
    label: 'Physical Security',
    type: 'select',
    options: ['N/A', 'Key', 'Swipe Card', 'Key Code'],
  },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

const CommsRoomSection = forwardRef(function CommsRoomSection({ auditId, sites, onSaved }, ref) {
  return (
    <EntityTable
      ref={ref}
      title="Comms Rooms"
      resourcePath="/api/comms-rooms"
      auditId={auditId}
      sites={sites}
      fields={FIELDS}
      emptyRow={{ physical_security_description: 'N/A' }}
      onSaved={onSaved}
    />
  );
});

export default CommsRoomSection;
