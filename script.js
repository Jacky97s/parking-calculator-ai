document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const ruleImageInput = document.getElementById('rule-image');
    const imagePreview = document.getElementById('image-preview');
    const uploadArea = document.getElementById('upload-area');
    const uploadStatus = document.getElementById('upload-status');
    const resetUploadBtn = document.getElementById('reset-upload-btn');
    
    // Date time picker elements
    const entryDateInput = document.getElementById('entry-date');
    const entryTimeInput = document.getElementById('entry-time');
    const exitDateInput = document.getElementById('exit-date');
    const exitTimeInput = document.getElementById('exit-time');
    const nowEntryBtn = document.getElementById('now-entry-btn');
    const plusHourBtn = document.getElementById('plus-hour-btn');
    
    // Button and result elements
    const calculateBtn = document.getElementById('calculate-btn');
    const feeResult = document.getElementById('fee-result');
    
    // Settings related elements
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const apiKeyInput = document.getElementById('api-key');
    const togglePasswordBtn = document.getElementById('toggle-password');
    
    // Loading indicator
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingMessage = document.getElementById('loading-message');
    
    // Store parsed parking rules
    let parsedParkingRules = null;
    // Store dynamically generated calculation function
    let dynamicCalculatorFunction = null;
    // Store the original code of the dynamic function
    let calculatorFunctionCode = '';
    // Store API key
    let apiKey = localStorage.getItem('openai_api_key') || '';
    // Store uploaded photo
    let uploadedImageSrc = '';
    
    // Initialize
    init();
    
    function init() {
        // Set API key (if available)
        apiKeyInput.value = apiKey;
        
        // Set current time
        setCurrentDateTime();
        
        // Add event listeners
        addEventListeners();
        
        // Check if there is a stored API key
        updateUIBasedOnAPIKey();
        
        // Check if there are stored photos and calculation functions
        restoreFromLocalStorage();
    }
    
    // Restore data from localStorage
    function restoreFromLocalStorage() {
        try {
            // Restore photo
            const savedImageSrc = localStorage.getItem('parking_calculator_image');
            if (savedImageSrc) {
                uploadedImageSrc = savedImageSrc;
                const img = document.createElement('img');
                img.src = savedImageSrc;
                imagePreview.appendChild(img);
                disableUploadArea();
            }
            
            // Restore parsed rules
            const savedRules = localStorage.getItem('parking_calculator_rules');
            if (savedRules) {
                parsedParkingRules = JSON.parse(savedRules);
            }
            
            // Restore calculation function
            const savedFunctionCode = localStorage.getItem('parking_calculator_function');
            if (savedFunctionCode) {
                calculatorFunctionCode = savedFunctionCode;
                
                try {
                    // Recreate function
                    dynamicCalculatorFunction = new Function('entryTime', 'exitTime', `
                        ${calculatorFunctionCode}
                        try {
                            return calculateFee(entryTime, exitTime);
                        } catch (e) {
                            console.error("Calculation function execution error:", e);
                            throw e;
                        }
                    `);
                    
                    // Test function usability
                    const testEntry = new Date();
                    const testExit = new Date(testEntry.getTime() + 60 * 60 * 1000);
                    const testFee = dynamicCalculatorFunction(testEntry, testExit);
                    console.log('Calculation function restored from local storage, test result:', testFee);
                    
                    // Enable calculate button
                    calculateBtn.disabled = false;
                    
                    showToast('Data restored from local storage', 'info');
                } catch (error) {
                    console.error('Error restoring calculation function:', error);
                    showToast('Failed to restore calculation function, please upload image again', 'error');
                    resetLocalStorage();
                }
            }
        } catch (error) {
            console.error('Error restoring data from local storage:', error);
            resetLocalStorage();
        }
    }
    
    // Save data to localStorage
    function saveToLocalStorage() {
        try {
            // Save photo
            if (uploadedImageSrc) {
                localStorage.setItem('parking_calculator_image', uploadedImageSrc);
            }
            
            // Save parsed rules
            if (parsedParkingRules) {
                localStorage.setItem('parking_calculator_rules', JSON.stringify(parsedParkingRules));
            }
            
            // Save calculation function
            if (calculatorFunctionCode) {
                localStorage.setItem('parking_calculator_function', calculatorFunctionCode);
            }
            
            console.log('Data saved to local storage');
        } catch (error) {
            console.error('Error saving to local storage:', error);
            showToast('Failed to save data, possibly due to large data size', 'warning');
        }
    }
    
    // Clear localStorage
    function resetLocalStorage() {
        localStorage.removeItem('parking_calculator_image');
        localStorage.removeItem('parking_calculator_rules');
        localStorage.removeItem('parking_calculator_function');
        console.log('Local storage data cleared');
    }
    
    function addEventListeners() {
        // Settings related
        settingsBtn.addEventListener('click', openSettingsModal);
        closeModalBtn.addEventListener('click', closeSettingsModal);
        saveSettingsBtn.addEventListener('click', saveSettings);
        togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
        
        // Upload related
        ruleImageInput.addEventListener('change', handleImageUpload);
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('drop', handleDrop);
        uploadArea.addEventListener('click', function(e) {
            // Avoid duplicate triggers, if clicking on the input element itself, don't trigger again
            if (e.target !== ruleImageInput) {
                triggerFileInput();
            }
        });
        resetUploadBtn.addEventListener('click', resetUpload);
        
        // Time related
        nowEntryBtn.addEventListener('click', setCurrentDateTime);
        plusHourBtn.addEventListener('click', addOneHour);
        entryDateInput.addEventListener('change', validateDateTimes);
        entryTimeInput.addEventListener('change', validateDateTimes);
        exitDateInput.addEventListener('change', validateDateTimes);
        exitTimeInput.addEventListener('change', validateDateTimes);
        
        // Calculation related
        calculateBtn.addEventListener('click', calculateParkingFee);
        
        // Click outside modal to close
        window.addEventListener('click', function(e) {
            if (e.target === settingsModal) {
                closeSettingsModal();
            }
        });
    }
    
    // Reset upload area
    function resetUpload() {
        // Clear image preview
        imagePreview.innerHTML = '';
        
        // Enable upload area
        uploadArea.classList.remove('disabled');
        ruleImageInput.classList.remove('disabled');
        ruleImageInput.value = '';
        
        // Hide upload status
        uploadStatus.textContent = '';
        uploadStatus.className = 'status-indicator';
        uploadStatus.style.display = 'none';
        
        // Hide reset button
        resetUploadBtn.style.display = 'none';
        
        // Reset parsing state
        resetParsingState();
        
        // Disable calculate button
        calculateBtn.disabled = true;
        
        // Reset result area
        feeResult.textContent = 'Please upload an image and set time before calculating';
        
        // Clear local storage
        resetLocalStorage();
        
        // Clear uploaded image
        uploadedImageSrc = '';
        
        // Show notification
        showToast('Reset complete, you can upload a new image', 'info');
    }
    
    // Settings related functions
    function openSettingsModal() {
        settingsModal.classList.add('active');
    }
    
    function closeSettingsModal() {
        settingsModal.classList.remove('active');
    }
    
    function saveSettings() {
        apiKey = apiKeyInput.value.trim();
        
        // Save API key to local storage
        if (apiKey) {
            localStorage.setItem('openai_api_key', apiKey);
            showToast('Settings saved', 'success');
        } else {
            localStorage.removeItem('openai_api_key');
            showToast('API key cleared', 'warning');
        }
        
        updateUIBasedOnAPIKey();
        closeSettingsModal();
    }
    
    function updateUIBasedOnAPIKey() {
        // Update UI to reflect whether there is an API key
        if (apiKey) {
            settingsBtn.innerHTML = '<i class="fas fa-cog"></i>';
            settingsBtn.classList.add('has-key');
        } else {
            settingsBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
            settingsBtn.classList.remove('has-key');
            showToast('Please set OpenAI API key first', 'warning');
        }
    }
    
    function togglePasswordVisibility() {
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            togglePasswordBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            apiKeyInput.type = 'password';
            togglePasswordBtn.innerHTML = '<i class="fas fa-eye"></i>';
        }
    }
    
    // Upload related functions
    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.match('image.*')) {
            showToast('Please upload an image file', 'error');
            return;
        }
        
        processUploadedImage(file);
    }
    
    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add('dragover');
    }
    
    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
        
        if (uploadArea.classList.contains('disabled')) {
            return;
        }
        
        const file = e.dataTransfer.files[0];
        if (!file) return;
        
        if (!file.type.match('image.*')) {
            showToast('Please upload an image file', 'error');
            return;
        }
        
        processUploadedImage(file);
    }
    
    function triggerFileInput() {
        if (!uploadArea.classList.contains('disabled')) {
            ruleImageInput.click();
        }
    }
    
    async function processUploadedImage(file) {
        // Check API key
        if (!apiKey) {
            showToast('Please set OpenAI API key first', 'error');
            openSettingsModal();
            return;
        }
        
        // Show loading status
        showLoading('Processing image...');
        
        // Clear preview area
        imagePreview.innerHTML = '';
        
        // Create image element and add to preview area
        const reader = new FileReader();
        reader.onload = async function(e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            imagePreview.appendChild(img);
            
            // Save image data
            uploadedImageSrc = e.target.result;
            
            // Disable upload area
            disableUploadArea();
            
            // Reset parsing state
            resetParsingState();
            
            // Automatically parse image
            await parseImageRules(img.src);
        };
        
        reader.readAsDataURL(file);
    }
    
    function disableUploadArea() {
        uploadArea.classList.add('disabled');
        ruleImageInput.classList.add('disabled');
        uploadStatus.textContent = 'Image uploaded, click the reset button below to change';
        uploadStatus.classList.add('success');
        uploadStatus.style.display = 'block';
        
        // Show reset button
        resetUploadBtn.style.display = 'flex';
    }
    
    function resetParsingState() {
        parsedParkingRules = null;
        dynamicCalculatorFunction = null;
        calculatorFunctionCode = '';
    }
    
    // Time related functions
    function setCurrentDateTime() {
        const now = new Date();
        
        // Set entry time to now
        entryDateInput.value = formatDateForInput(now, 'date');
        entryTimeInput.value = formatDateForInput(now, 'time');
        
        // Set exit time to now plus one hour
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        exitDateInput.value = formatDateForInput(oneHourLater, 'date');
        exitTimeInput.value = formatDateForInput(oneHourLater, 'time');
        
        validateDateTimes();
    }
    
    function addOneHour() {
        // Get current exit time
        const exitDateTime = getCombinedDateTime(exitDateInput.value, exitTimeInput.value);
        
        // Add one hour
        const newExitTime = new Date(exitDateTime.getTime() + 60 * 60 * 1000);
        
        // Update input fields
        exitDateInput.value = formatDateForInput(newExitTime, 'date');
        exitTimeInput.value = formatDateForInput(newExitTime, 'time');
        
        validateDateTimes();
    }
    
    function validateDateTimes() {
        const entryDateTime = getCombinedDateTime(entryDateInput.value, entryTimeInput.value);
        const exitDateTime = getCombinedDateTime(exitDateInput.value, exitTimeInput.value);
        
        if (exitDateTime <= entryDateTime) {
            calculateBtn.disabled = true;
            showToast('Exit time must be after entry time', 'error');
        } else {
            calculateBtn.disabled = !dynamicCalculatorFunction;
        }
    }
    
    function getCombinedDateTime(dateValue, timeValue) {
        if (!dateValue || !timeValue) return new Date();
        
        const dateTimeStr = `${dateValue}T${timeValue}`;
        return new Date(dateTimeStr);
    }
    
    function formatDateForInput(date, type) {
        if (type === 'date') {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } else if (type === 'time') {
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${hours}:${minutes}`;
        }
        return '';
    }
    
    // Parse image rules related functions
    async function parseImageRules(imageSrc) {
        try {
            // Get base64 encoding of the image (remove data:image/jpeg;base64, prefix)
            const imgBase64 = imageSrc.split(',')[1];
            
            // Update loading message
            updateLoadingMessage('Analyzing parking fee rules...');
            
            // Prepare data to send to OpenAI API
            const payload = {
                model: "o4-mini",
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "This is an image of parking lot fee rules. Please carefully analyze the parking fee rate rules in the image and extract the following information in structured JSON format:\n1. Base rate (hourly or per-entry fee)\n2. Time period differences (if different rates for different times)\n3. Special discounts (such as first hour discounts)\n4. Daily maximum fee (if any)\n5. Rate differences for different vehicle types (if any)\n\nPlease only return JSON format data with no other text. The JSON structure should include at least one pricing rule, each with rate, applicable time period, vehicle type, etc."
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/jpeg;base64,${imgBase64}`
                                }
                            }
                        ]
                    }
                ]
            };

            // Send request to OpenAI API
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API error: ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            let content = data.choices[0].message.content;
            
            // Try to extract JSON from response
            let jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                           content.match(/{[\s\S]*}/);
            
            let parsedJson;
            if (jsonMatch) {
                try {
                    parsedJson = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                } catch (e) {
                    throw new Error('Could not parse JSON response');
                }
            } else {
                try {
                    // Try to parse the entire response directly
                    parsedJson = JSON.parse(content);
                } catch (e) {
                    throw new Error('Response does not contain valid JSON format');
                }
            }
            
            // Store parsed rules
            parsedParkingRules = parsedJson;
            
            // Save to local storage
            localStorage.setItem('parking_calculator_rules', JSON.stringify(parsedParkingRules));
            
            // Generate calculation function
            await generateCalculatorFunction(parsedParkingRules);
            
        } catch (error) {
            console.error('Parsing error:', error);
            uploadStatus.textContent = 'Image parsing failed, please click the reset button below to try again';
            uploadStatus.classList.remove('success');
            uploadStatus.classList.add('error');
            hideLoading();
        }
    }
    
    // Use OpenAI to generate calculation function
    async function generateCalculatorFunction(rules) {
        try {
            // Update loading message
            updateLoadingMessage('Generating calculation function...');
            
            // Prepare data to send to OpenAI API
            const payload = {
                model: "o4-mini",
                messages: [
                    {
                        role: "system",
                        content: "You are a professional JavaScript programmer specializing in parking fee calculation logic. Based on the provided parking fee rule JSON, please generate a JavaScript function named calculateFee that accepts entry time (entryTime) and exit time (exitTime) as parameters (both are JavaScript Date objects) and returns the calculated parking fee. The function needs to accurately implement the provided rules, handling various time periods and special cases. Only return the function code without any explanation text or code block markers. The function must be complete, valid, and executable correctly."
                    },
                    {
                        role: "user",
                        content: `Based on the following parking fee rule JSON, generate a JavaScript function to calculate parking fees:\n\n${JSON.stringify(rules, null, 2)}\n\nPlease ensure the function can accurately handle all rules and conditions, only return the complete function code, no markdown code block markers, and no additional explanations.`
                    }
                ]
            };

            // Send request to OpenAI API
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API error: ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            let functionCode = data.choices[0].message.content;
            
            // Clean up code, remove all markdown code block markers
            functionCode = functionCode.replace(/```(?:javascript|js)?/g, '').replace(/```/g, '').trim();
            
            // Ensure code is a complete function definition
            if (!functionCode.startsWith('function calculateFee')) {
                // Try to find function definition
                const funcMatch = functionCode.match(/function\s+calculateFee[\s\S]*?}/);
                if (funcMatch) {
                    functionCode = funcMatch[0];
                } else {
                    throw new Error('Could not extract valid calculateFee function from response');
                }
            }
            
            // Check function structure integrity (simple check to ensure function has beginning and end)
            const openBraces = (functionCode.match(/{/g) || []).length;
            const closeBraces = (functionCode.match(/}/g) || []).length;
            
            if (openBraces !== closeBraces) {
                throw new Error(`Function code braces don't match: ${openBraces} open, ${closeBraces} close`);
            }
            
            console.log('Function code to evaluate:', functionCode);
            
            // Save function code
            calculatorFunctionCode = functionCode;
            
            // Use a safer way to create function
            try {
                // Wrap function in an immediately invoked function expression for testing
                const testFunction = new Function(`
                    try {
                        ${functionCode}
                        return true;
                    } catch (e) {
                        throw new Error("Function syntax error: " + e.message);
                    }
                `);
                
                // Run test
                testFunction();
                
                // If test passes, create the real function
                dynamicCalculatorFunction = new Function('entryTime', 'exitTime', `
                    ${functionCode}
                    try {
                        return calculateFee(entryTime, exitTime);
                    } catch (e) {
                        console.error("Calculation function execution error:", e);
                        throw e;
                    }
                `);
                
                console.log('Dynamic calculation function generated');
                
                // Test function usability
                const testEntry = new Date();
                const testExit = new Date(testEntry.getTime() + 60 * 60 * 1000); // 1 hour later
                try {
                    const testFee = dynamicCalculatorFunction(testEntry, testExit);
                    console.log('Function test result:', testFee);
                    
                    // Save function code to local storage
                    localStorage.setItem('parking_calculator_function', calculatorFunctionCode);
                    
                    // Save all data
                    saveToLocalStorage();
                    
                    // Enable calculate button
                    calculateBtn.disabled = false;
                    
                    // Update upload status
                    uploadStatus.textContent = 'Image successfully analyzed, ready for calculation';
                    uploadStatus.classList.add('success');
                    
                    // Show success notification
                    showToast('Analysis complete, please set time and calculate', 'success');
                } catch (testError) {
                    console.warn('Function test warning:', testError.message);
                    throw testError;
                }
            } catch (evalError) {
                console.error('Function evaluation error:', evalError);
                throw new Error(`Could not create calculation function: ${evalError.message}`);
            }
            
            // Hide loading indicator
            hideLoading();
        } catch (error) {
            console.error('Error generating calculation function:', error);
            uploadStatus.textContent = 'Failed to generate calculation function, please click the reset button below to try again';
            uploadStatus.classList.remove('success');
            uploadStatus.classList.add('error');
            
            // When failed, ensure dynamic calculation function is set to null
            dynamicCalculatorFunction = null;
            calculatorFunctionCode = '';
            
            // Hide loading indicator
            hideLoading();
        }
    }
    
    // Calculate parking fee
    function calculateParkingFee() {
        // Get entry and exit times
        const entryDateTime = getCombinedDateTime(entryDateInput.value, entryTimeInput.value);
        const exitDateTime = getCombinedDateTime(exitDateInput.value, exitTimeInput.value);
        
        // Check if times are valid
        if (isNaN(entryDateTime.getTime()) || isNaN(exitDateTime.getTime())) {
            showToast('Please enter valid times', 'error');
            return;
        }
        
        // Check if exit time is earlier than entry time
        if (exitDateTime <= entryDateTime) {
            showToast('Exit time must be after entry time', 'error');
            return;
        }
        
        // Calculate parking duration (milliseconds)
        const parkingDuration = exitDateTime - entryDateTime;
        
        // Convert milliseconds to hours and minutes
        const hours = Math.floor(parkingDuration / (1000 * 60 * 60));
        const minutes = Math.floor((parkingDuration % (1000 * 60 * 60)) / (1000 * 60));
        
        let fee = 0;
        let calculationMethod = '';
        
        // Check if there is a dynamically generated calculation function
        if (dynamicCalculatorFunction) {
            try {
                console.log('Using dynamically generated calculation function...');
                fee = dynamicCalculatorFunction(entryDateTime, exitDateTime);
                calculationMethod = 'Using AI-generated specialized calculation function';
                console.log('Fee calculated using dynamic function:', fee);
            } catch (error) {
                console.error('Dynamic calculation function error:', error);
                // If dynamic function fails, notify user
                showToast(`Calculation error: ${error.message}. Please reanalyze the image.`, 'error');
                return;
            }
        } else {
            // If there is no dynamically generated function, prompt user to parse image first
            if (parsedParkingRules) {
                showToast('Please wait for AI to complete function generation, or reanalyze the image.', 'warning');
            } else {
                showToast('Please upload and analyze parking fee rule image first.', 'warning');
            }
            return;
        }
        
        // Show result, including calculation method used
        feeResult.innerHTML = `
            <div class="fee-detail">
                <div class="fee-time">
                    <i class="fas fa-clock"></i> Parking Time: ${hours} hours ${minutes} minutes
                </div>
                <div class="fee-amount">
                    <i class="fas fa-dollar-sign"></i> Estimated Fee: ${fee} dollars
                </div>
                <div class="fee-method">
                    <i class="fas fa-info-circle"></i> ${calculationMethod}
                </div>
            </div>
        `;
    }
    
    // Utility functions
    function showLoading(message) {
        loadingMessage.textContent = message;
        loadingOverlay.classList.add('active');
    }
    
    function hideLoading() {
        loadingOverlay.classList.remove('active');
    }
    
    function updateLoadingMessage(message) {
        loadingMessage.textContent = message;
    }
    
    function showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Add icon
        let icon = '';
        switch(type) {
            case 'success': icon = '<i class="fas fa-check-circle"></i>'; break;
            case 'error': icon = '<i class="fas fa-exclamation-circle"></i>'; break;
            case 'warning': icon = '<i class="fas fa-exclamation-triangle"></i>'; break;
            default: icon = '<i class="fas fa-info-circle"></i>';
        }
        
        toast.innerHTML = `
            <div class="toast-content">
                ${icon}
                <span>${message}</span>
            </div>
            <button class="toast-close"><i class="fas fa-times"></i></button>
        `;
        
        // Add to document
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Close button event
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        });
        
        // Auto close
        setTimeout(() => {
            if (document.body.contains(toast)) {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (document.body.contains(toast)) {
                        document.body.removeChild(toast);
                    }
                }, 300);
            }
        }, 5000);
    }
}); 