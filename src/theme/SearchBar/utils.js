const utils = {};

utils.deepClone = (obj) => JSON.parse(JSON.stringify(obj));

utils.mergeKeyWithParent = (obj, key) => {
  const merged = {};
  Object.keys(obj).forEach((k) => {
    if (k === key) {
      Object.keys(obj[key]).forEach((subKey) => {
        merged[subKey] = obj[key][subKey];
      });
    } else {
      merged[k] = obj[k];
    }
  });
  return merged;
};

utils.compact = (arr) => arr.filter((v) => v !== null && v !== undefined && v !== '');

utils.groupBy = (arr, key) =>
  arr.reduce((acc, item) => {
    const value = item[key] || 'Outros';
    acc[value] = acc[value] || [];
    acc[value].push(item);
    return acc;
  }, {});

utils.flattenAndFlagFirst = (grouped, flag) => {
  const flattened = [];
  Object.keys(grouped).forEach((k) => {
    grouped[k].forEach((item, idx) => {
      item[flag] = idx === 0;
      flattened.push(item);
    });
  });
  return flattened;
};

utils.getHighlightedValue = (hit, key) => {
  const res = hit._highlightResult && hit._highlightResult[key];
  if (!res) return hit[key];
  return res.value || hit[key];
};

utils.getSnippetedValue = (hit, key) => {
  const res = hit._snippetResult && hit._snippetResult[key];
  if (!res) return null;
  return res.value;
};

export default utils;

