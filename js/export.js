const ExportModule = (() => {
	const generateCSV = async () => {
		const data = await CyberSitDB.getAllData();
		const assessments = data.assessments || [];
		const journal = data.journal || [];

		let csv = 'timestamp,participant_id,q1,q2,q3,q4,q5,q6,q7,q8,q9,q10,q11,q12,q13,q14,q15,journal\n';

		const safe = (v) => (v === undefined || v === null) ? '' : String(v).replace(/"/g, '""');

		assessments.forEach((assess) => {
			const resp = assess.responses || {};
			const journalEntry = journal.find(j => new Date(j.timestamp).toDateString() === assess.date);
			csv += `"${safe(assess.timestamp)}","${safe(assess.participant_id)}","${safe(resp.q1)}","${safe(resp.q2)}","${safe(resp.q3)}","${safe(resp.q4)}","${safe(resp.q5)}","${safe(resp.q6)}","${safe(resp.q7)}","${safe(resp.q8)}","${safe(resp.q9)}","${safe(resp.q10)}","${safe(resp.q11)}","${safe(resp.q12)}","${safe(resp.q13)}","${safe(resp.q14)}","${safe(resp.q15)}","${journalEntry ? safe(journalEntry.text) : ''}\n`;
		});

		return csv;
	};

	const generateJSON = async () => {
		const data = await CyberSitDB.getAllData();
		return JSON.stringify(data, null, 2);
	};

	const downloadFile = (content, filename, type) => {
		const element = document.createElement('a');
		element.setAttribute('href', 'data:' + type + ';charset=utf-8,' + encodeURIComponent(content));
		element.setAttribute('download', filename);
		element.style.display = 'none';
		document.body.appendChild(element);
		element.click();
		document.body.removeChild(element);
	};

	return { generateCSV, generateJSON, downloadFile };
})();