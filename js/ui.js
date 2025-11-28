const UI=(()=>{
  const QUESTIONS=[
    {id:1,text:"What were you doing in the past 30 minutes?",type:"multiple_choice",options:["Sitting (working/studying)","Sitting (leisure/screen time)","Standing","Walking","Light exercise","Moderate-vigorous exercise","Lying down","Other"]},
    {id:2,text:"Where were you?",type:"multiple_choice",options:["Home","Work/School","Transportation","Outdoors","Gym/Recreation","Other"]},
    {id:3,text:"Were you alone or with others?",type:"multiple_choice",options:["Alone","With family","With friends","With colleagues","In public crowd"]},
    {id:4,text:"How long have you been sitting/lying down continuously?",type:"slider",min:0,max:240,unit:"minutes"},
    {id:5,text:"Rate your current physical discomfort",type:"slider",min:0,max:10},
    {id:6,text:"How is your mood right now?",type:"slider",min:0,max:10},
    {id:7,text:"How is your energy level?",type:"slider",min:0,max:10},
    {id:8,text:"Are you feeling stressed?",type:"slider",min:0,max:10},
    {id:9,text:"Have you checked your phone excessively in the past hour?",type:"multiple_choice",options:["Not at all","A few times","Frequently","Almost constantly"]},
    {id:10,text:"Do you plan to move/exercise in the next hour?",type:"multiple_choice",options:["Yes, definitely","Maybe","Probably not","No"]},
    {id:11,text:"How many steps have you taken today? (best estimate)",type:"slider",min:0,max:30000,unit:"steps"},
    {id:12,text:"How many minutes of screen time (excluding work) today?",type:"slider",min:0,max:600,unit:"minutes"},
    {id:13,text:"Any thoughts or reflections for today? (optional)",type:"textarea",max_length:500,evening_only:true},
    {id:14,text:"How would you rate your overall physical activity today?",type:"slider",min:0,max:10,evening_only:true},
    {id:15,text:"How many hours of screen time (all devices) today?",type:"slider",min:0,max:16,unit:"hours",evening_only:true}
  ];

  const renderHome=async()=>{
    const settings=await CyberSitDB.getSettings();
    const todayAssessments=await CyberSitDB.getTodayAssessments();
    const journals=await CyberSitDB.getJournalEntries();
    const todayJournal=journals.find(j=>j.date===new Date().toDateString());
    const hour=new Date().getHours();
    let greeting="Good morning";
    if(hour>=12&&hour<18) greeting="Good afternoon";
    if(hour>=18) greeting="Good evening";

    const avatarElement=document.createElement('div');
    avatarElement.className='avatar-container';
    avatarElement.appendChild(Avatar.createAvatarSVG());

    const promptsPerDay = settings.prompts_per_day||8;
    const todayMaxSteps = (todayAssessments.length>0) ? Math.max(...todayAssessments.map(a=>a.responses.q11||0)) : 0;
    const stepGoal = settings.step_goal||8000;
    const stepPercent = Math.min(100, (todayMaxSteps/stepGoal)*100);

    return `
      <div class="home-screen">
        ${avatarElement.outerHTML}
        <div class="greeting-text">${greeting}, ${settings.participant_id}!</div>
        <div class="progress-card">
          <h3>Today's Assessments</h3>
          <div class="progress-ring">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" stroke="#ADD8E6" stroke-width="8" fill="none"></circle>
              <circle id="progress-fill" cx="50" cy="50" r="40" stroke="#87CEEB" stroke-width="8" fill="none" style="stroke-dasharray: ${251.2*todayAssessments.length/promptsPerDay}; stroke-dashoffset: 0;"></circle>
            </svg>
            <div class="progress-text">${todayAssessments.length}/${promptsPerDay}</div>
          </div>
        </div>
        <div class="metrics-section">
          <h3>Today's Tracking</h3>
          <div class="metric-card">
            <div class="metric-label">Max Steps Logged</div>
            <div class="metric-value">${todayMaxSteps.toLocaleString()} / ${stepGoal.toLocaleString()}</div>
            <div class="metric-bar" style="width: ${stepPercent}%"></div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Assessments Completed</div>
            <div class="metric-value">${todayAssessments.length}</div>
          </div>
          ${todayJournal?'<div class="metric-card"><div class="metric-label">Journal Entry</div><div class="metric-value">✓ Reflected</div></div>':''}
        </div>
        <button class="btn btn-primary btn-large" id="start-assessment">Start Assessment</button>
      </div>`;
  };

  const renderAssessment=(questionIndex,responses)=>{
    const question=QUESTIONS[questionIndex];
    if(!question) return '<div>Assessment complete!</div>';
    const hour=new Date().getHours();
    const isEvening=hour>=20;
    if(question.evening_only && !isEvening) return renderAssessment(questionIndex+1,responses);
    let responseInput='';
    if(question.type==='multiple_choice'){
      responseInput=`<div class="choice-grid">${question.options.map((opt,i)=>`<button class="choice-btn" data-value="${opt}" data-question="${question.id}">${opt}</button>`).join('')}</div>`;
    } else if(question.type==='slider'){
      const current=responses[question.id]||question.min;
      responseInput=`<div class="slider-container"><input type="range" class="slider" data-question="${question.id}" min="${question.min}" max="${question.max}" value="${current}"><div class="slider-value">${current} ${question.unit||''}</div></div>`;
    } else if(question.type==='textarea'){
      const current=responses[question.id]||'';
      responseInput=`<textarea class="journal-textarea" data-question="${question.id}" maxlength="${question.max_length}" placeholder="${question.placeholder||''}">${current}</textarea><div class="textarea-counter"><span id="char-count">0</span>/${question.max_length}</div>`;
    }
    const avatarElement=document.createElement('div');avatarElement.className='avatar-container';avatarElement.appendChild(Avatar.createAvatarSVG());
    return `<div class="assessment-screen">${avatarElement.outerHTML}<div class="question-counter">Question ${questionIndex+1} of ${QUESTIONS.filter(q=>!q.evening_only||hour>=20).length}</div><h3 class="question-text">${question.text}</h3>${responseInput}<div class="assessment-buttons"><button class="btn btn-secondary" id="prev-btn" ${questionIndex===0?'disabled':''}> ← Previous</button><button class="btn btn-secondary" id="skip-btn">Skip</button><button class="btn btn-primary" id="next-btn">Next →</button></div></div>`;
  };

  const renderHistory=async()=>{
    const journals=await CyberSitDB.getJournalEntries();
    return `<div class="history-screen"><div class="tabs"><button class="tab-btn active" data-days="7">7 Days</button><button class="tab-btn" data-days="14">14 Days</button><button class="tab-btn" data-days="30">30 Days</button></div><div class="charts-section"><div class="chart-container"><canvas id="moodChart"></canvas></div><div class="chart-container"><canvas id="energyChart"></canvas></div><div class="chart-container"><canvas id="stepsChart"></canvas></div></div><div class="journal-section"><h3>Journal Entries</h3>${journals.length===0?'<p class="empty-state">No journal entries yet. Reflect during evening assessments.</p>':''}<div id="journal-list">${journals.map(entry=>`<div class="journal-entry" data-id="${entry.id}"><div class="journal-date">${new Date(entry.timestamp).toLocaleDateString()}</div><div class="journal-preview">${entry.text.substring(0,100)}...</div><div class="journal-actions"><button class="btn-small journal-expand">Read More</button><button class="btn-small journal-delete">Delete</button></div></div>`).join('')}</div></div><button class="btn btn-primary" id="export-btn">Export Data</button></div>`;
  };

  const renderSettings=async()=>{
    const settings=await CyberSitDB.getSettings();
    return `<div class="settings-screen"><div class="settings-section"><h3>Participant Information</h3><label>Participant ID</label><input type="text" id="participant-id" value="${settings.participant_id}" class="input-field"></div><div class="settings-section"><h3>Assessment Schedule</h3><label>Start Time</label><input type="number" id="start-hour" min="0" max="23" value="${settings.assessment_start_hour}" class="input-field"><label>End Time</label><input type="number" id="end-hour" min="0" max="23" value="${settings.assessment_end_hour}" class="input-field"><label>Prompts per Day</label><input type="range" id="prompts-per-day" min="2" max="8" value="${settings.prompts_per_day}" class="input-slider"><span id="prompts-display">${settings.prompts_per_day}</span></div><div class="settings-section"><h3>Tracking</h3><label><input type="checkbox" id="screen-tracking" ${settings.screen_tracking_enabled?'checked':''}> Track screen time in app</label><label><input type="checkbox" id="step-logging" ${settings.step_logging_enabled!==false?'checked':''}> Enable step logging</label></div><div class="settings-section"><h3>Data Management</h3><button class="btn btn-secondary" id="export-data-btn">Export Data</button><button class="btn btn-secondary" id="clear-data-btn">Clear All Data</button></div><div class="settings-section"><h3>About CyberSit</h3><p>Clinical Ecological Momentary Assessment app for sedentary behavior intervention. Version 1.0</p></div><button class="btn btn-primary" id="save-settings-btn">Save Settings</button></div>`;
  };

  return {renderHome,renderAssessment,renderHistory,renderSettings,QUESTIONS};

})();
