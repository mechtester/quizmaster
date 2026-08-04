let qaQuestions = [];
let mcqQuestions = [];
let currentQAIndex = 0;
let currentMCQIndex = 0;
let qaScore = 0;
let mcqCorrect = 0;
let mcqWrong = 0;
let db;

// ---------- Text-to-Speech (Web Speech API) state ----------
let voiceEnabled = false;
let voiceControlsCollapsed = false; // true = sliders/dropdown hidden via the ▲/▼ button
let availableVoices = [];   // English voices only
let voiceSettings = {
    voiceURI: null,
    rate: 1,
    pitch: 1,
    volume: 1
};
const DEFAULT_VOICE_SETTINGS = { rate: 1, pitch: 1, volume: 1 };
const speechSupported = 'speechSynthesis' in window;

// Initialize IndexedDB
const request = indexedDB.open('quizDB', 1);

request.onupgradeneeded = function(event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains('qaQuestions')) {
        db.createObjectStore('qaQuestions', { keyPath: 'id', autoIncrement: true });
    }
    if (!db.objectStoreNames.contains('mcqQuestions')) {
        db.createObjectStore('mcqQuestions', { keyPath: 'id', autoIncrement: true });
    }
};

request.onsuccess = function(event) {
    db = event.target.result;
    loadExistingQuestions();
};

request.onerror = function(event) {
    console.error('Database error: ' + event.target.errorCode);
};

function loadExistingQuestions() {
    retrieveQAQuestions();
    retrieveMCQQuestions();
}

/* =========================================================
   Text-to-Speech (TTS) helpers
   ========================================================= */

// Populate the voice dropdown with English-language voices only.
// getVoices() can return an empty list until the async
// 'voiceschanged' event fires in some browsers, so this is called
// both immediately and whenever that event fires.
function populateVoiceList() {
    if (!speechSupported) return;

    const voiceSelect = document.getElementById('voiceSelect');
    availableVoices = window.speechSynthesis
        .getVoices()
        .filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));

    if (!voiceSelect) return;

    const previousSelection = voiceSettings.voiceURI;
    voiceSelect.innerHTML = '';

    if (availableVoices.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No English voices found';
        voiceSelect.appendChild(option);
        return;
    }

    availableVoices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.voiceURI;
        option.textContent = `${voice.name} (${voice.lang})${voice.default ? ' — default' : ''}`;
        voiceSelect.appendChild(option);
    });

    // Keep the previously selected voice if it still exists, otherwise
    // fall back to the first available English voice.
    const stillExists = previousSelection &&
        availableVoices.some(v => v.voiceURI === previousSelection);

    voiceSettings.voiceURI = stillExists ? previousSelection : availableVoices[0].voiceURI;
    voiceSelect.value = voiceSettings.voiceURI;
}

if (speechSupported) {
    populateVoiceList();
    // Chrome (and others) load voices asynchronously
    window.speechSynthesis.onvoiceschanged = populateVoiceList;
} else {
    console.warn('Speech synthesis is not supported in this browser.');
}

// Turn the voice feature on/off from the toggle switch
function toggleVoiceFeature() {
    if (!speechSupported) {
        alert('Sorry, your browser does not support text-to-speech.');
        document.getElementById('voiceToggle').checked = false;
        return;
    }

    voiceEnabled = document.getElementById('voiceToggle').checked;

    document.getElementById('voicePanelActions').classList.toggle('hidden', !voiceEnabled);
    voiceControlsCollapsed = false; // always expand settings when turning voice on
    updateVoiceControlsVisibility();

    if (voiceEnabled) {
        populateVoiceList();
        // Read the currently displayed question right away
        const questionText = document.getElementById('qaQuestion')?.textContent;
        if (questionText) {
            speakText(questionText);
        }
    } else {
        window.speechSynthesis.cancel();
    }
}

// Shows/hides the rate/pitch/volume/voice controls based on both the
// master toggle (voiceEnabled) and the collapse arrow (voiceControlsCollapsed)
function updateVoiceControlsVisibility() {
    const controls = document.getElementById('voiceControls');
    const arrow = document.getElementById('collapseArrow');
    if (!controls) return;

    const shouldShow = voiceEnabled && !voiceControlsCollapsed;
    controls.classList.toggle('hidden', !shouldShow);

    if (arrow) {
        arrow.textContent = voiceControlsCollapsed ? '▼' : '▲';
    }
}

// Up/down arrow button — collapses or expands the rate/pitch/volume/voice
// settings without turning the read-aloud feature itself off
function toggleVoiceControlsCollapse() {
    voiceControlsCollapsed = !voiceControlsCollapsed;
    updateVoiceControlsVisibility();
}

// Reset button — restores rate/pitch/volume to defaults and the voice
// dropdown to the first available English voice
function resetVoiceSettings() {
    voiceSettings.rate = DEFAULT_VOICE_SETTINGS.rate;
    voiceSettings.pitch = DEFAULT_VOICE_SETTINGS.pitch;
    voiceSettings.volume = DEFAULT_VOICE_SETTINGS.volume;
    voiceSettings.voiceURI = availableVoices.length > 0 ? availableVoices[0].voiceURI : null;

    const rateSlider = document.getElementById('rateSlider');
    const pitchSlider = document.getElementById('pitchSlider');
    const volumeSlider = document.getElementById('volumeSlider');
    const voiceSelect = document.getElementById('voiceSelect');

    if (rateSlider) rateSlider.value = DEFAULT_VOICE_SETTINGS.rate;
    if (pitchSlider) pitchSlider.value = DEFAULT_VOICE_SETTINGS.pitch;
    if (volumeSlider) volumeSlider.value = DEFAULT_VOICE_SETTINGS.volume;

    const rateValue = document.getElementById('rateValue');
    const pitchValue = document.getElementById('pitchValue');
    const volumeValue = document.getElementById('volumeValue');
    if (rateValue) rateValue.textContent = DEFAULT_VOICE_SETTINGS.rate;
    if (pitchValue) pitchValue.textContent = DEFAULT_VOICE_SETTINGS.pitch;
    if (volumeValue) volumeValue.textContent = DEFAULT_VOICE_SETTINGS.volume;

    if (voiceSelect && voiceSettings.voiceURI) {
        voiceSelect.value = voiceSettings.voiceURI;
    }
}

/* ---------- Full screen quiz mode ---------- */

// Toggles TRUE full-monitor-screen mode (hides browser chrome/tabs) using
// the Fullscreen API on the whole page, then a body class hides everything
// except the question card via CSS. Fullscreening the whole document
// (instead of just the small question wrapper) avoids the "half screen /
// black empty space" issue some browsers have when a small, non-stretched
// element is requested as the fullscreen target.
function toggleFullScreen() {
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;

    if (!isFullscreen) {
        const el = document.documentElement;
        if (el.requestFullscreen) {
            el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
            el.webkitRequestFullscreen();
        } else if (el.msRequestFullscreen) {
            el.msRequestFullscreen();
        } else {
            alert('Sorry, full screen mode is not supported in this browser.');
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}

// Single source of truth: whatever the browser's real fullscreen state is,
// this keeps the button label and the body class in sync — including when
// the user exits via the Esc key instead of clicking the button.
function syncFullscreenState() {
    const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);

    document.body.classList.toggle('qa-fullscreen-mode', isFullscreen);

    const btn = document.getElementById('fullscreenBtn');
    if (btn) {
        btn.textContent = isFullscreen ? '✕ Exit Full Screen' : '⛶ Full Screen';
    }
}

document.addEventListener('fullscreenchange', syncFullscreenState);
document.addEventListener('webkitfullscreenchange', syncFullscreenState);
document.addEventListener('MSFullscreenChange', syncFullscreenState);

// Update rate / pitch / volume / voice from the sliders & dropdown
function updateVoiceSetting(type, value) {
    switch (type) {
        case 'rate':
            voiceSettings.rate = parseFloat(value);
            document.getElementById('rateValue').textContent = value;
            break;
        case 'pitch':
            voiceSettings.pitch = parseFloat(value);
            document.getElementById('pitchValue').textContent = value;
            break;
        case 'volume':
            voiceSettings.volume = parseFloat(value);
            document.getElementById('volumeValue').textContent = value;
            break;
        case 'voice':
            voiceSettings.voiceURI = value;
            break;
    }
}

// Speak arbitrary text using the currently selected voice/rate/pitch/volume
function speakText(text) {
    if (!speechSupported || !text) return;

    // Stop anything currently being read before starting the next utterance
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoice = availableVoices.find(v => v.voiceURI === voiceSettings.voiceURI);

    if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
    } else {
        utterance.lang = 'en-US';
    }

    utterance.rate = voiceSettings.rate;
    utterance.pitch = voiceSettings.pitch;
    utterance.volume = voiceSettings.volume;

    window.speechSynthesis.speak(utterance);
}

// "Test Voice" button — lets the user preview settings without a question loaded
function testVoice() {
    speakText('This is a test of the selected voice, rate, pitch and volume settings.');
}

// "Repeat Question" button — re-reads the currently displayed question on demand,
// regardless of whether the auto-read toggle is on
function repeatQuestion() {
    const questionText = document.getElementById('qaQuestion')?.textContent;
    if (questionText) {
        speakText(questionText);
    }
}

/* ========================================================= */

// Sample data generation for downloads
function generateSampleQAData() {
    const data = [
    { "question": "What does HTTPS stand for?", "answer": "HyperText Transfer Protocol Secure" },
    { "question": "Which encryption protocol is commonly used in HTTPS?", "answer": "TLS (Transport Layer Security)" },
    { "question": "What is the purpose of a Content Security Policy (CSP) in web security?", "answer": "To prevent cross-site scripting (XSS) and data injection attacks by restricting resource loading." },
    { "question": "What is the principle of 'least privilege' in cloud security?", "answer": "Users and services should only have the minimum level of access required to perform their tasks." },
    { "question": "What does IAM stand for in cloud computing?", "answer": "Identity and Access Management" },
    { "question": "What is the difference between symmetric and asymmetric encryption?", "answer": "Symmetric encryption uses a single key for encryption and decryption, while asymmetric encryption uses a public-private key pair." },
    { "question": "What is a Zero Trust security model?", "answer": "A security framework that assumes no entity inside or outside the network is trusted by default." },
    { "question": "What is the Same-Origin Policy (SOP) in web security?", "answer": "A browser security feature that prevents scripts from accessing data from a different domain." },
    { "question": "What is a Man-in-the-Middle (MitM) attack?", "answer": "An attack where an attacker intercepts and potentially alters communication between two parties." },
    { "question": "What is the role of a Web Application Firewall (WAF)?", "answer": "To protect web applications by filtering and monitoring HTTP traffic for malicious activity." }
    ];
    return data;
}

function generateSampleMCQData() {
    const data = [
{
        "question": "Which protocol is used to secure websites with encryption?",
        "option1": "HTTP",
        "option2": "FTP",
        "option3": "HTTPS",
        "option4": "SMTP",
        "correct": "HTTPS"
    },
    {
        "question": "What does TLS stand for in web security?",
        "option1": "Transport Layer Security",
        "option2": "Total Lock System",
        "option3": "Transfer Load Security",
        "option4": "Trusted Link Service",
        "correct": "Transport Layer Security"
    },
    {
        "question": "Which cloud computing model provides virtual machines and networking resources?",
        "option1": "SaaS",
        "option2": "PaaS",
        "option3": "IaaS",
        "option4": "DaaS",
        "correct": "IaaS"
    },
    {
        "question": "Which HTTP header is used to prevent cross-site scripting (XSS)?",
        "option1": "X-Frame-Options",
        "option2": "Content-Security-Policy",
        "option3": "Referrer-Policy",
        "option4": "Strict-Transport-Security",
        "correct": "Content-Security-Policy"
    },
    {
        "question": "What is the purpose of multi-factor authentication (MFA)?",
        "option1": "To add an extra layer of security",
        "option2": "To replace strong passwords",
        "option3": "To encrypt network traffic",
        "option4": "To prevent malware attacks",
        "correct": "To add an extra layer of security"
    }
    ];
    return data;
}

// Download sample files
function downloadSampleQA() {
    const data = generateSampleQAData();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Q&A Questions");
    XLSX.writeFile(wb, "sample_qa_questions.xlsx");
}

function downloadSampleMCQ() {
    const data = generateSampleMCQData();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MCQ Questions");
    XLSX.writeFile(wb, "sample_mcq_questions.xlsx");
}

function handleQAFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Get first sheet
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);

            if (jsonData.length === 0) {
                alert("No data found in the Excel file!");
                return;
            }

            const questions = jsonData.map(row => ({
                question: row.question?.trim(),
                answer: row.answer?.trim()
            })).filter(q => q.question && q.answer);

            if (questions.length === 0) {
                alert("No valid questions found. Please check the file format!");
                return;
            }

            // Store in IndexedDB
            const transaction = db.transaction(['qaQuestions'], 'readwrite');
            const store = transaction.objectStore('qaQuestions');
            questions.forEach(q => store.add(q));

            transaction.oncomplete = function() {
                retrieveQAQuestions();
            };
        } catch (error) {
            console.error('Error processing file:', error);
            alert("Error processing the Excel file. Please check the format.");
        }
    };

    reader.readAsArrayBuffer(file);
}

// Modified handleMCQFile function
function handleMCQFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Get first sheet
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);

            if (jsonData.length === 0) {
                alert("No data found in the Excel file!");
                return;
            }

            // Validate the structure of each question
            const questions = [];
            for (let row of jsonData) {
                // Check if all required fields exist and are not empty
                if (!row.question || !row.option1 || !row.option2 || !row.option3 ||
                    !row.option4 || !row.correct) {
                    continue;
                }

                const question = {
                    question: row.question.trim(),
                    options: [
                        row.option1.trim(),
                        row.option2.trim(),
                        row.option3.trim(),
                        row.option4.trim()
                    ],
                    correct: row.correct.trim()
                };

                // Verify that the correct answer is one of the options
                if (question.options.includes(question.correct)) {
                    questions.push(question);
                }
            }

            if (questions.length === 0) {
                alert("No valid questions found. Please ensure your Excel file has the following columns:\nquestion, option1, option2, option3, option4, correct");
                return;
            }

            // Store in IndexedDB
            const transaction = db.transaction(['mcqQuestions'], 'readwrite');
            const store = transaction.objectStore('mcqQuestions');
            questions.forEach(q => store.add(q));

            transaction.oncomplete = function() {
                retrieveMCQQuestions();
            };
        } catch (error) {
            console.error('Error processing file:', error);
            alert("Error processing the Excel file. Please ensure your file follows the required format:\n- First row should contain headers\n- Required columns: question, option1, option2, option3, option4, correct");
        }
    };

    reader.readAsArrayBuffer(file);
}

function showSection(sectionId) {
    // Stop any ongoing speech when navigating between sections
    if (speechSupported) {
        window.speechSynthesis.cancel();
    }

    // Safety net: exit full screen mode if the user somehow navigates away
    // while still in it (the Back to Home button is hidden during full
    // screen, but this covers any other trigger path)
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
    if (isFullscreen) {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
    }

    document.getElementById('homeScreen').classList.add('hidden');
    document.getElementById('qaSection').classList.add('hidden');
    document.getElementById('mcqSection').classList.add('hidden');
    document.getElementById(sectionId).classList.remove('hidden');
}

function retrieveQAQuestions() {
    const transaction = db.transaction(['qaQuestions'], 'readonly');
    const store = transaction.objectStore('qaQuestions');
    const request = store.getAll();

    request.onsuccess = function(event) {
        qaQuestions = shuffleArray(event.target.result);
        if (qaQuestions.length > 0) {
            document.getElementById('qaTotalQuestions').textContent = qaQuestions.length;
            document.getElementById('qaRemainingQuestions').textContent = qaQuestions.length;
            document.getElementById('qaQuestions').classList.remove('hidden');
            showQAQuestion();
        }
    };
}

function retrieveMCQQuestions() {
    const transaction = db.transaction(['mcqQuestions'], 'readonly');
    const store = transaction.objectStore('mcqQuestions');
    const request = store.getAll();

    request.onsuccess = function(event) {
        mcqQuestions = shuffleArray(event.target.result);
        if (mcqQuestions.length > 0) {
            document.getElementById('mcqTotalQuestions').textContent = mcqQuestions.length;
            document.getElementById('mcqRemainingQuestions').textContent = mcqQuestions.length;
            document.getElementById('mcqQuestions').classList.remove('hidden');
            showMCQQuestion();
        }
    };
}

// Modified showQAQuestion function
function showQAQuestion() {
    const question = qaQuestions[currentQAIndex];
    document.getElementById('qaQuestion').textContent = question.question;
    document.getElementById('qaAnswer').classList.add('hidden');
    document.getElementById('qaAnswer').textContent = '';

    // Update remaining questions count - subtract current index from total length
    const remainingQuestions = qaQuestions.length - currentQAIndex - 1;
    document.getElementById('qaRemainingQuestions').textContent = Math.max(remainingQuestions, 0);

    // Automatically read the question aloud if voice mode is enabled
    if (voiceEnabled) {
        speakText(question.question);
    }
}

function showQAAnswer() {
    const answer = qaQuestions[currentQAIndex].answer;
    document.getElementById('qaAnswer').textContent = answer;
    document.getElementById('qaAnswer').classList.remove('hidden');
}

// ... (keep all the previous code up to showMCQQuestion) ...

// Modified showMCQQuestion function
function showMCQQuestion() {
    const question = mcqQuestions[currentMCQIndex];
    document.getElementById('mcqQuestion').textContent = question.question;

    const optionsHtml = question.options.map((option, index) => `
        <div>
            <input type="radio" name="mcq" value="${option}" id="opt${index}">
            <label for="opt${index}">${option}</label>
        </div>
    `).join('');

    document.getElementById('mcqOptions').innerHTML = optionsHtml;

    // Reset feedback and ensure it's hidden
    const feedback = document.getElementById('mcqFeedback');
    feedback.textContent = '';
    feedback.className = 'hidden';
    feedback.classList.add('hidden');

    // Update navigation buttons
    document.getElementById('prevMcqBtn').classList.toggle('hidden', currentMCQIndex === 0);
    document.getElementById('nextMcqBtn').classList.toggle('hidden', currentMCQIndex >= mcqQuestions.length - 1);

    // Update remaining questions count - subtract current index from total length
    const remainingQuestions = mcqQuestions.length - currentMCQIndex - 1;
    document.getElementById('mcqRemainingQuestions').textContent = Math.max(remainingQuestions, 0);

    // Add click handlers to radio buttons and ensure they're enabled
    document.querySelectorAll('input[name="mcq"]').forEach(radio => {
        radio.disabled = false;
        radio.checked = false;
        radio.onclick = checkMCQAnswer;
    });
}

function checkMCQAnswer(e) {
    const selectedAnswer = e.target.value;
    const correctAnswer = mcqQuestions[currentMCQIndex].correct;
    const feedback = document.getElementById('mcqFeedback');

    if (selectedAnswer === correctAnswer) {
        feedback.textContent = "Correct!";
        feedback.className = "correct";
        mcqCorrect++;
    } else {
        feedback.textContent = `Incorrect. The correct answer is: ${correctAnswer}`;
        feedback.className = "incorrect";
        mcqWrong++;
    }

    feedback.classList.remove('hidden');
    document.getElementById('mcqCorrect').textContent = mcqCorrect;
    document.getElementById('mcqWrong').textContent = mcqWrong;

    // Disable all radio buttons after answer is selected
    document.querySelectorAll('input[name="mcq"]').forEach(radio => {
        radio.disabled = true;
    });
}

// Modified nextQAQuestion function
function nextQAQuestion() {
    if (currentQAIndex < qaQuestions.length - 1) {
        currentQAIndex++;
        showQAQuestion();
    } else {
        if (speechSupported) {
            window.speechSynthesis.cancel();
        }
        document.getElementById('qaQuestions').innerHTML = `
            <div class="question-card">
                <h3>Quiz Complete!</h3>
                <p>You've completed all questions!</p>
                <button onclick="restartQAQuiz()" class="btn btn-primary">Start Over</button>
            </div>
        `;
        // Set remaining questions to 0 when quiz is complete
        document.getElementById('qaRemainingQuestions').textContent = '0';
    }
}

function previousQAQuestion() {
    if (currentQAIndex > 0) {
        currentQAIndex--;
        showQAQuestion();
    }
}

function nextMCQQuestion() {
    if (currentMCQIndex < mcqQuestions.length - 1) {
        currentMCQIndex++;
        showMCQQuestion();
    } else {
        const percentage = ((mcqCorrect / mcqQuestions.length) * 100).toFixed(1);
        document.getElementById('mcqQuestions').innerHTML = `
            <div class="question-card">
                <h3>Quiz Complete!</h3>
                <p>Correct Answers: ${mcqCorrect}</p>
                <p>Wrong Answers: ${mcqWrong}</p>
                <p>Score: ${percentage}%</p>
                <button onclick="restartMCQQuiz()" class="btn btn-primary">Start Over</button>
            </div>
        `;
        // Set remaining questions to 0 when quiz is complete
        document.getElementById('mcqRemainingQuestions').textContent = '0';
    }
}

function previousMCQQuestion() {
    if (currentMCQIndex > 0) {
        currentMCQIndex--;
        showMCQQuestion();
    }
}

// Modified restartQAQuiz function to properly reset the count
function restartQAQuiz() {
    currentQAIndex = 0;
    qaScore = 0;
    qaQuestions = shuffleArray(qaQuestions);

    // Reset the UI elements
    const questionsDiv = document.getElementById('qaQuestions');
    questionsDiv.innerHTML = `
        <div class="question-card">
            <p id="qaQuestion" class="question"></p>
            <div class="answer-section">
                <button onclick="repeatQuestion()" class="btn btn-outline">🔊 Repeat Question</button>
                <button onclick="showQAAnswer()" class="btn btn-secondary">Show Answer</button>
                <p id="qaAnswer" class="hidden answer"></p>
            </div>
            <div class="navigation-buttons">
                <button onclick="previousQAQuestion()" class="btn btn-outline">Previous</button>
                <button onclick="nextQAQuestion()" class="btn btn-outline">Next</button>
            </div>
        </div>
    `;

    // Update total questions count
    document.getElementById('qaTotalQuestions').textContent = qaQuestions.length;
    // Set initial remaining questions count (total - 1 for current question)
    document.getElementById('qaRemainingQuestions').textContent = qaQuestions.length - 1;
    questionsDiv.classList.remove('hidden');
    showQAQuestion();
}


// Modified restartMCQQuiz function to properly reset the count
function restartMCQQuiz() {
    currentMCQIndex = 0;
    mcqCorrect = 0;
    mcqWrong = 0;
    mcqQuestions = shuffleArray(mcqQuestions);

    // Reset the UI elements
    const questionsDiv = document.getElementById('mcqQuestions');
    questionsDiv.innerHTML = `
        <div class="question-card">
            <p id="mcqQuestion" class="question"></p>
            <div id="mcqOptions" class="options-grid"></div>
            <p id="mcqFeedback" class="hidden"></p>
            <div class="navigation-buttons">
                <button onclick="previousMCQQuestion()" class="btn btn-outline" id="prevMcqBtn">Previous</button>
                <button onclick="nextMCQQuestion()" class="btn btn-outline" id="nextMcqBtn">Next</button>
            </div>
        </div>
        <div class="score-summary">
            <span>Correct: <span id="mcqCorrect" class="correct">0</span></span>
            <span>Wrong: <span id="mcqWrong" class="incorrect">0</span></span>
        </div>
    `;

    // Update total questions count
    document.getElementById('mcqTotalQuestions').textContent = mcqQuestions.length;
    // Set initial remaining questions count (total - 1 for current question)
    document.getElementById('mcqRemainingQuestions').textContent = mcqQuestions.length - 1;
    questionsDiv.classList.remove('hidden');

    // Reset score display
    document.getElementById('mcqCorrect').textContent = '0';
    document.getElementById('mcqWrong').textContent = '0';

    showMCQQuestion();
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Modified clearIndexedDB function
function clearIndexedDB() {
    const transaction = db.transaction(['qaQuestions', 'mcqQuestions'], 'readwrite');
    const qaStore = transaction.objectStore('qaQuestions');
    const mcqStore = transaction.objectStore('mcqQuestions');

    qaStore.clear();
    mcqStore.clear();

    transaction.oncomplete = function() {
        if (speechSupported) {
            window.speechSynthesis.cancel();
        }

        // Clear all data arrays
        qaQuestions = [];
        mcqQuestions = [];
        currentQAIndex = 0;
        currentMCQIndex = 0;
        qaScore = 0;
        mcqCorrect = 0;
        mcqWrong = 0;

        // Reset UI elements
        document.getElementById('qaTotalQuestions').textContent = '0';
        document.getElementById('qaRemainingQuestions').textContent = '0';
        document.getElementById('mcqTotalQuestions').textContent = '0';
        document.getElementById('mcqRemainingQuestions').textContent = '0';
        document.getElementById('mcqCorrect').textContent = '0';
        document.getElementById('mcqWrong').textContent = '0';

        // Reset question containers to their initial state
        document.getElementById('qaQuestions').innerHTML = `
            <div class="question-card">
                <p id="qaQuestion" class="question"></p>
                <div class="answer-section">
                    <button onclick="repeatQuestion()" class="btn btn-outline">🔊 Repeat Question</button>
                    <button onclick="showQAAnswer()" class="btn btn-secondary">Show Answer</button>
                    <p id="qaAnswer" class="hidden answer"></p>
                </div>
                <div class="navigation-buttons">
                    <button onclick="previousQAQuestion()" class="btn btn-outline">Previous</button>
                    <button onclick="nextQAQuestion()" class="btn btn-outline">Next</button>
                </div>
            </div>
        `;

        document.getElementById('mcqQuestions').innerHTML = `
            <div class="question-card">
                <p id="mcqQuestion" class="question"></p>
                <div id="mcqOptions" class="options-grid"></div>
                <p id="mcqFeedback" class="hidden"></p>
                <div class="navigation-buttons">
                    <button onclick="previousMCQQuestion()" class="btn btn-outline" id="prevMcqBtn">Previous</button>
                    <button onclick="nextMCQQuestion()" class="btn btn-outline" id="nextMcqBtn">Next</button>
                </div>
            </div>
            <div class="score-summary">
                <span>Correct: <span id="mcqCorrect" class="correct">0</span></span>
                <span>Wrong: <span id="mcqWrong" class="incorrect">0</span></span>
            </div>
        `;

        // Hide question sections
        document.getElementById('qaQuestions').classList.add('hidden');
        document.getElementById('mcqQuestions').classList.add('hidden');

        // Clear file inputs
        document.getElementById('qaFile').value = '';
        document.getElementById('mcqFile').value = '';

        // Return to home screen
        showSection('homeScreen');
    };
}
// Initialize by showing home screen
document.addEventListener('DOMContentLoaded', function() {
    showSection('homeScreen');
});
