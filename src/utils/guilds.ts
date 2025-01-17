const selectedValues: string[] = [];

export function storeGuildIdsValues(values: string[]) {
  return selectedValues.push(values.join(' '));
}

export function setGuildIdsValues(values: string[]) {
  selectedValues.push(values.join(' '));
}

export const getGuildIdsValues = selectedValues;
