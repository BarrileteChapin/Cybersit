const CyberSitDB = (() => {
	const DB_NAME = 'cybersit-db';
	const DB_VERSION = 1;
	let db = null;

	const init = async () =>
		new Promise((resolve, reject) => {
			const request = indexedDB.open(DB_NAME, DB_VERSION);
			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				db = request.result;
				resolve(db);
			};
			request.onupgradeneeded = (e) => {
				const database = e.target.result;
				if (!database.objectStoreNames.contains('assessments')) {
					const assessStore = database.createObjectStore('assessments', { keyPath: 'id' });
					assessStore.createIndex('timestamp', 'timestamp', { unique: false });
					assessStore.createIndex('date', 'date', { unique: false });
				}
				if (!database.objectStoreNames.contains('journal')) {
					const journalStore = database.createObjectStore('journal', { keyPath: 'id' });
					journalStore.createIndex('date', 'date', { unique: false });
				}
				if (!database.objectStoreNames.contains('passive_data')) {
					database.createObjectStore('passive_data', { keyPath: 'id' });
				}
				if (!database.objectStoreNames.contains('settings')) {
					database.createObjectStore('settings', { keyPath: 'participant_id' });
				}
			};
		});

	const saveAssessment = async (assessment) => {
		// Normalize response keys to the `qN` format expected by charts/export modules
		if (assessment && assessment.responses && typeof assessment.responses === 'object') {
			const normalized = {};
			Object.keys(assessment.responses).forEach((k) => {
				const keyStr = String(k);
				const outKey = keyStr.startsWith('q') ? keyStr : `q${keyStr}`;
				normalized[outKey] = assessment.responses[k];
			});
			// Ensure all q1..q15 keys exist (empty string if missing)
			for (let i = 1; i <= 15; i++) {
				const k = `q${i}`;
				if (!(k in normalized)) normalized[k] = '';
			}
			// Convert numeric-like strings to numbers for charting/export
			Object.keys(normalized).forEach((kk) => {
				const v = normalized[kk];
				if (typeof v === 'string' && v !== '' && /^-?\d+(?:\.\d+)?$/.test(v)) {
					normalized[kk] = Number(v);
				}
			});
			assessment.responses = normalized;
		} else {
			// Ensure structure exists
			assessment.responses = {};
			for (let i = 1; i <= 15; i++) assessment.responses[`q${i}`] = '';
		}

		assessment.id = 'assess_' + Date.now();
		assessment.timestamp = new Date().toISOString();
		assessment.date = new Date().toDateString();

		return new Promise((resolve, reject) => {
			try {
				const transaction = db.transaction(['assessments'], 'readwrite');
				const store = transaction.objectStore('assessments');
				const req = store.add(assessment);
				req.onsuccess = () => resolve(assessment);
				req.onerror = () => reject(req.error);
			} catch (err) {
				reject(err);
			}
		});
	};

	const getAssessments = async (dateFilter = null) =>
		new Promise((resolve, reject) => {
			const transaction = db.transaction(['assessments'], 'readonly');
			const store = transaction.objectStore('assessments');
			const request = store.getAll();
			request.onsuccess = () => {
				let results = request.result;
				if (dateFilter) {
					results = results.filter((a) => a.date === dateFilter);
				}
				resolve(results);
			};
			request.onerror = () => reject(request.error);
		});

	const getTodayAssessments = async () => getAssessments(new Date().toDateString());

	const saveJournal = async (entry) => {
		entry.id = 'journal_' + Date.now();
		entry.timestamp = new Date().toISOString();
		entry.date = new Date().toDateString();
		return new Promise((resolve, reject) => {
			try {
				const transaction = db.transaction(['journal'], 'readwrite');
				const store = transaction.objectStore('journal');
				const req = store.add(entry);
				req.onsuccess = () => resolve(entry);
				req.onerror = () => reject(req.error);
			} catch (err) {
				reject(err);
			}
		});
	};

	const getJournalEntries = async () =>
		new Promise((resolve, reject) => {
			const transaction = db.transaction(['journal'], 'readonly');
			const store = transaction.objectStore('journal');
			const request = store.getAll();
			request.onsuccess = () => resolve(request.result.reverse());
			request.onerror = () => reject(request.error);
		});

	const updateJournal = async (id, text) =>
		new Promise((resolve, reject) => {
			const transaction = db.transaction(['journal'], 'readwrite');
			const store = transaction.objectStore('journal');
			const getRequest = store.get(id);
			getRequest.onsuccess = () => {
				const entry = getRequest.result;
				entry.text = text;
				entry.updated = new Date().toISOString();
				const updateRequest = store.put(entry);
				updateRequest.onsuccess = () => resolve();
				updateRequest.onerror = () => reject(updateRequest.error);
			};
		});

	const deleteJournal = async (id) => {
		const transaction = db.transaction(['journal'], 'readwrite');
		const store = transaction.objectStore('journal');
		return store.delete(id);
	};

	const saveSettings = async (settings) => {
		return new Promise((resolve, reject) => {
			try {
				const transaction = db.transaction(['settings'], 'readwrite');
				const store = transaction.objectStore('settings');
				const req = store.put(settings);
				req.onsuccess = () => resolve(settings);
				req.onerror = () => reject(req.error);
			} catch (err) {
				reject(err);
			}
		});
	};

	const getSettings = async () =>
		new Promise((resolve, reject) => {
			const transaction = db.transaction(['settings'], 'readonly');
			const store = transaction.objectStore('settings');
			const request = store.get('P001');
			request.onsuccess = () =>
				resolve(
					request.result || {
						participant_id: 'P001',
						assessment_start_hour: 8,
						assessment_end_hour: 22,
						prompts_per_day: 5,
						step_goal: 8000,
						notifications_enabled: true,
						screen_tracking_enabled: true,
					}
				);
			request.onerror = () => reject(request.error);
		});

	const getAllData = async () => {
		const assessments = await getAssessments();
		const journal = await getJournalEntries();
		const settings = await getSettings();
		return { assessments, journal, settings };
	};

	const clearAllData = async () => {
		return new Promise((resolve, reject) => {
			try {
				const transaction = db.transaction(['assessments', 'journal', 'passive_data'], 'readwrite');
				transaction.objectStore('assessments').clear();
				transaction.objectStore('journal').clear();
				transaction.objectStore('passive_data').clear();
				transaction.oncomplete = () => resolve();
				transaction.onerror = () => reject(transaction.error);
			} catch (err) {
				reject(err);
			}
		});
	};

	return {
		init,
		saveAssessment,
		getAssessments,
		getTodayAssessments,
		saveJournal,
		getJournalEntries,
		updateJournal,
		deleteJournal,
		saveSettings,
		getSettings,
		getAllData,
		clearAllData,
	};
})();