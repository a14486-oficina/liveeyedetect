const _unacknowledged = new Map();

export function addDetection(personId, name) {
  if (personId == null) return;
  if (!_unacknowledged.has(personId)) {
    _unacknowledged.set(personId, name);
    window.dispatchEvent(new CustomEvent("detection-update"));
  }
}

export function acknowledge(personId) {
  if (_unacknowledged.delete(personId)) {
    window.dispatchEvent(new CustomEvent("detection-update"));
  }
}

export function getUnacknowledged() {
  return new Map(_unacknowledged);
}

export function hasUnacknowledged() {
  return _unacknowledged.size > 0;
}

export function getCount() {
  return _unacknowledged.size;
}

export function clearAll() {
  _unacknowledged.clear();
  window.dispatchEvent(new CustomEvent("detection-update"));
}
