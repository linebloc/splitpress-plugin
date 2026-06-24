const STATUS_MAP = {
  active:    { label: 'Active',    cls: 'sp-badge--green'  },
  draft:     { label: 'Draft',     cls: 'sp-badge--gray'   },
  scheduled: { label: 'Scheduled', cls: 'sp-badge--blue'   },
  paused:    { label: 'Paused',    cls: 'sp-badge--yellow' },
  ended:     { label: 'Ended',     cls: 'sp-badge--purple' },
  winner:    { label: 'Winner',    cls: 'sp-badge--green'  },
};

export default function StatusBadge({ status }) {
  const { label, cls } = STATUS_MAP[status] ?? { label: status, cls: 'sp-badge--gray' };
  return <span className={`sp-badge ${cls}`}>{label}</span>;
}
