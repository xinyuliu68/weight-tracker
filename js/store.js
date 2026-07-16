/* ==========================================
   store.js — localStorage 数据层
   ========================================== */

const Store = (() => {
  const KEYS = {
    persons: 'wt_persons',
    records: 'wt_records',
    currentPersonId: 'wt_current_person',
  };

  // --- 内部读取 ---
  function _read(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('Store read error:', e);
      return null;
    }
  }

  function _write(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Store write error:', e);
    }
  }

  // --- 人物 CRUD ---

  function getPersons() {
    return _read(KEYS.persons) || [];
  }

  function getPerson(id) {
    const persons = getPersons();
    return persons.find(p => p.id === id) || null;
  }

  function addPerson(data) {
    const persons = getPersons();
    const person = {
      id: data.id || uuid(),
      name: data.name || '未命名',
      color: data.color || '#D9413B',
      avatarColor: data.avatarColor || data.color || '#E8A09B',
      height: data.height || null,
      targetWeight: data.targetWeight || null,
      unit: data.unit || 'kg',
      createdAt: data.createdAt || today(),
    };
    persons.push(person);
    _write(KEYS.persons, persons);
    return person;
  }

  function updatePerson(id, data) {
    const persons = getPersons();
    const idx = persons.findIndex(p => p.id === id);
    if (idx === -1) return null;
    persons[idx] = { ...persons[idx], ...data, id }; // 防止 id 被覆盖
    _write(KEYS.persons, persons);
    return persons[idx];
  }

  function deletePerson(id) {
    const persons = getPersons().filter(p => p.id !== id);
    _write(KEYS.persons, persons);
    // 同时删除该人物的所有记录
    const records = getRecords().filter(r => r.personId !== id);
    _write(KEYS.records, records);
    // 如果当前选中是该人物，清除
    if (getCurrentPersonId() === id) {
      const remaining = getPersons();
      setCurrentPersonId(remaining.length > 0 ? remaining[0].id : null);
    }
  }

  // --- 当前人物 ---
  function getCurrentPersonId() {
    return localStorage.getItem(KEYS.currentPersonId) || null;
  }

  function setCurrentPersonId(id) {
    if (id) {
      localStorage.setItem(KEYS.currentPersonId, id);
    } else {
      localStorage.removeItem(KEYS.currentPersonId);
    }
  }

  function getCurrentPerson() {
    const id = getCurrentPersonId();
    if (!id) {
      const persons = getPersons();
      return persons.length > 0 ? persons[0] : null;
    }
    return getPerson(id) || (getPersons().length > 0 ? getPersons()[0] : null);
  }

  // --- 记录 CRUD ---

  function getRecords(personId) {
    const all = _read(KEYS.records) || [];
    if (personId) return all.filter(r => r.personId === personId);
    return all;
  }

  function getRecord(id) {
    const all = _read(KEYS.records) || [];
    return all.find(r => r.id === id) || null;
  }

  function addRecord(data) {
    const all = _read(KEYS.records) || [];
    const record = {
      id: data.id || uuid(),
      personId: data.personId,
      weight: parseFloat(data.weight),
      type: data.type || 'morning', // 'morning' | 'evening'
      date: data.date || today(),
      time: data.time || nowTime(),
      note: data.note || '',
      createdAt: data.createdAt || new Date().toISOString(),
    };
    all.push(record);
    _write(KEYS.records, all);
    return record;
  }

  function updateRecord(id, data) {
    const all = _read(KEYS.records) || [];
    const idx = all.findIndex(r => r.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...data, id };
    _write(KEYS.records, all);
    return all[idx];
  }

  function deleteRecord(id) {
    const all = (_read(KEYS.records) || []).filter(r => r.id !== id);
    _write(KEYS.records, all);
  }

  function getRecordsByDate(personId, date) {
    const records = getRecords(personId);
    return records.filter(r => r.date === date);
  }

  // 获取某天的记录，可按类型筛选
  function getRecordsByDateAndType(personId, date, type) {
    const records = getRecordsByDate(personId, date);
    if (type) return records.filter(r => r.type === type);
    return records;
  }

  // 获取今天的记录（返回早/晚两条）
  function getTodayRecords(personId) {
    return getRecordsByDate(personId, today());
  }

  // 获取今天早上记录
  function getTodayMorningRecord(personId) {
    const records = getRecordsByDate(personId, today());
    return records.find(r => r.type === 'morning') || null;
  }

  // 获取最新早上记录
  function getLatestMorningRecord(personId) {
    const records = getRecords(personId).filter(r => r.type === 'morning');
    if (records.length === 0) return null;
    records.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.time.localeCompare(a.time);
    });
    return records[0];
  }

  // 获取最新记录（可选类型筛选，默认早上）
  function getLatestRecord(personId, type) {
    let records = getRecords(personId);
    if (type) records = records.filter(r => r.type === type);
    if (records.length === 0) return null;
    records.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.time.localeCompare(a.time);
    });
    return records[0];
  }

  // 获取最早早上记录
  function getEarliestMorningRecord(personId) {
    const records = getRecords(personId).filter(r => r.type === 'morning');
    if (records.length === 0) return null;
    records.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });
    return records[0];
  }

  // 获取最早记录
  function getEarliestRecord(personId, type) {
    let records = getRecords(personId);
    if (type) records = records.filter(r => r.type === type);
    if (records.length === 0) return null;
    records.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });
    return records[0];
  }

  // 获取前一条早上记录
  function getPreviousMorningRecord(personId, currentRecord) {
    const records = getRecords(personId)
      .filter(r => r.type === 'morning')
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.time.localeCompare(a.time);
      });
    const idx = records.findIndex(r => r.id === currentRecord.id);
    return idx >= 0 && idx < records.length - 1 ? records[idx + 1] : null;
  }

  // 同 personId + date + type 视为同一条记录，覆盖
  function upsertRecord(data) {
    const existing = getRecordsByDate(data.personId, data.date)
      .filter(r => r.type === (data.type || 'morning'));
    if (existing.length > 0) {
      return updateRecord(existing[0].id, data);
    }
    return addRecord(data);
  }

  // --- 导出/导入 ---

  function exportData() {
    const data = {
      version: 2,
      exportedAt: new Date().toISOString(),
      persons: getPersons(),
      records: getRecords(),
      currentPersonId: getCurrentPersonId(),
    };
    return JSON.stringify(data, null, 2);
  }

  function importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data.persons || !data.records) {
        throw new Error('数据格式不正确');
      }
      // 兼容旧数据：给没有 type 字段的记录补上 morning
      const records = data.records.map(r => ({
        ...r,
        type: r.type || 'morning',
      }));
      _write(KEYS.persons, data.persons);
      _write(KEYS.records, records);
      if (data.currentPersonId) {
        setCurrentPersonId(data.currentPersonId);
      }
      return true;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  }

  function clearAll() {
    localStorage.removeItem(KEYS.persons);
    localStorage.removeItem(KEYS.records);
    localStorage.removeItem(KEYS.currentPersonId);
  }

  // 是否有数据
  function hasData() {
    return getPersons().length > 0;
  }

  return {
    getPersons,
    getPerson,
    addPerson,
    updatePerson,
    deletePerson,
    getCurrentPersonId,
    setCurrentPersonId,
    getCurrentPerson,
    getRecords,
    getRecord,
    addRecord,
    updateRecord,
    deleteRecord,
    getRecordsByDate,
    getRecordsByDateAndType,
    getTodayRecords,
    getTodayMorningRecord,
    getLatestMorningRecord,
    getLatestRecord,
    getEarliestMorningRecord,
    getEarliestRecord,
    getPreviousMorningRecord,
    upsertRecord,
    exportData,
    importData,
    clearAll,
    hasData,
  };
})();
