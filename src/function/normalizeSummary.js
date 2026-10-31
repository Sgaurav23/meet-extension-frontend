function normalizeSummary(item, index = 0) {
  if (typeof item === 'string') {
    return { id: `local-${index}`, title: 'Google Meet', summary: item };
  }
  return {
    id: item.id ?? item.createdAt ?? `summary-${index}`,
    title: item.title || 'Google Meet',
    summary: item.summary ?? item.summaryText ?? '',
    createdAt: item.createdAt,
  };
}

export default normalizeSummary;