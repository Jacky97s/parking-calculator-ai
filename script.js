document.addEventListener('DOMContentLoaded', function() {
    // 獲取DOM元素
    const ruleImageInput = document.getElementById('rule-image');
    const imagePreview = document.getElementById('image-preview');
    const uploadArea = document.getElementById('upload-area');
    const uploadStatus = document.getElementById('upload-status');
    const resetUploadBtn = document.getElementById('reset-upload-btn');
    
    // 日期時間選擇器元素
    const entryDateInput = document.getElementById('entry-date');
    const entryTimeInput = document.getElementById('entry-time');
    const exitDateInput = document.getElementById('exit-date');
    const exitTimeInput = document.getElementById('exit-time');
    const nowEntryBtn = document.getElementById('now-entry-btn');
    const plusHourBtn = document.getElementById('plus-hour-btn');
    
    // 按鈕和結果元素
    const calculateBtn = document.getElementById('calculate-btn');
    const feeResult = document.getElementById('fee-result');
    
    // 設定相關元素
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const apiKeyInput = document.getElementById('api-key');
    const togglePasswordBtn = document.getElementById('toggle-password');
    
    // 加載指示器
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingMessage = document.getElementById('loading-message');
    
    // 儲存解析後的停車規則
    let parsedParkingRules = null;
    // 儲存動態生成的計算函數
    let dynamicCalculatorFunction = null;
    // 儲存動態函數的原始代碼
    let calculatorFunctionCode = '';
    // 儲存API密鑰
    let apiKey = localStorage.getItem('openai_api_key') || '';
    // 儲存上傳的照片
    let uploadedImageSrc = '';
    
    // 初始化
    init();
    
    function init() {
        // 設置API密鑰（如果有）
        apiKeyInput.value = apiKey;
        
        // 設定當前時間
        setCurrentDateTime();
        
        // 添加事件監聽器
        addEventListeners();
        
        // 檢查是否有儲存的API密鑰
        updateUIBasedOnAPIKey();
        
        // 檢查是否有儲存的照片和計算函數
        restoreFromLocalStorage();
    }
    
    // 從localStorage恢復數據
    function restoreFromLocalStorage() {
        try {
            // 恢復照片
            const savedImageSrc = localStorage.getItem('parking_calculator_image');
            if (savedImageSrc) {
                uploadedImageSrc = savedImageSrc;
                const img = document.createElement('img');
                img.src = savedImageSrc;
                imagePreview.appendChild(img);
                disableUploadArea();
            }
            
            // 恢復解析規則
            const savedRules = localStorage.getItem('parking_calculator_rules');
            if (savedRules) {
                parsedParkingRules = JSON.parse(savedRules);
            }
            
            // 恢復計算函數
            const savedFunctionCode = localStorage.getItem('parking_calculator_function');
            if (savedFunctionCode) {
                calculatorFunctionCode = savedFunctionCode;
                
                try {
                    // 重新創建函數
                    dynamicCalculatorFunction = new Function('entryTime', 'exitTime', `
                        ${calculatorFunctionCode}
                        try {
                            return calculateFee(entryTime, exitTime);
                        } catch (e) {
                            console.error("計算函數執行錯誤:", e);
                            throw e;
                        }
                    `);
                    
                    // 測試函數可用性
                    const testEntry = new Date();
                    const testExit = new Date(testEntry.getTime() + 60 * 60 * 1000);
                    const testFee = dynamicCalculatorFunction(testEntry, testExit);
                    console.log('已從本地儲存恢復計算函數，測試結果:', testFee);
                    
                    // 啟用計算按鈕
                    calculateBtn.disabled = false;
                    
                    showToast('已從本地儲存恢復數據', 'info');
                } catch (error) {
                    console.error('恢復計算函數錯誤:', error);
                    showToast('恢復計算函數失敗，請重新上傳圖片', 'error');
                    resetLocalStorage();
                }
            }
        } catch (error) {
            console.error('從本地儲存恢復數據錯誤:', error);
            resetLocalStorage();
        }
    }
    
    // 儲存數據到localStorage
    function saveToLocalStorage() {
        try {
            // 儲存照片
            if (uploadedImageSrc) {
                localStorage.setItem('parking_calculator_image', uploadedImageSrc);
            }
            
            // 儲存解析規則
            if (parsedParkingRules) {
                localStorage.setItem('parking_calculator_rules', JSON.stringify(parsedParkingRules));
            }
            
            // 儲存計算函數
            if (calculatorFunctionCode) {
                localStorage.setItem('parking_calculator_function', calculatorFunctionCode);
            }
            
            console.log('數據已保存到本地儲存');
        } catch (error) {
            console.error('保存到本地儲存錯誤:', error);
            showToast('保存數據失敗，可能是數據過大', 'warning');
        }
    }
    
    // 清除localStorage
    function resetLocalStorage() {
        localStorage.removeItem('parking_calculator_image');
        localStorage.removeItem('parking_calculator_rules');
        localStorage.removeItem('parking_calculator_function');
        console.log('已清除本地儲存的數據');
    }
    
    function addEventListeners() {
        // 設定相關
        settingsBtn.addEventListener('click', openSettingsModal);
        closeModalBtn.addEventListener('click', closeSettingsModal);
        saveSettingsBtn.addEventListener('click', saveSettings);
        togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
        
        // 上傳相關
        ruleImageInput.addEventListener('change', handleImageUpload);
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('drop', handleDrop);
        uploadArea.addEventListener('click', function(e) {
            // 避免重複觸發，如果點擊的是 input 元素本身，不再額外觸發
            if (e.target !== ruleImageInput) {
                triggerFileInput();
            }
        });
        resetUploadBtn.addEventListener('click', resetUpload);
        
        // 時間相關
        nowEntryBtn.addEventListener('click', setCurrentDateTime);
        plusHourBtn.addEventListener('click', addOneHour);
        entryDateInput.addEventListener('change', validateDateTimes);
        entryTimeInput.addEventListener('change', validateDateTimes);
        exitDateInput.addEventListener('change', validateDateTimes);
        exitTimeInput.addEventListener('change', validateDateTimes);
        
        // 計算相關
        calculateBtn.addEventListener('click', calculateParkingFee);
        
        // 點擊模態框外部關閉模態框
        window.addEventListener('click', function(e) {
            if (e.target === settingsModal) {
                closeSettingsModal();
            }
        });
    }
    
    // 重設上傳區域
    function resetUpload() {
        // 清空圖片預覽
        imagePreview.innerHTML = '';
        
        // 啟用上傳區域
        uploadArea.classList.remove('disabled');
        ruleImageInput.classList.remove('disabled');
        ruleImageInput.value = '';
        
        // 隱藏上傳狀態
        uploadStatus.textContent = '';
        uploadStatus.className = 'status-indicator';
        uploadStatus.style.display = 'none';
        
        // 隱藏重設按鈕
        resetUploadBtn.style.display = 'none';
        
        // 重置解析結果
        resetParsingState();
        
        // 禁用計算按鈕
        calculateBtn.disabled = true;
        
        // 重置結果區域
        feeResult.textContent = '請上傳圖片並設定時間後計算';
        
        // 清除本地儲存
        resetLocalStorage();
        
        // 清除上傳的圖片
        uploadedImageSrc = '';
        
        // 顯示提示
        showToast('已重設，可重新上傳圖片', 'info');
    }
    
    // 設定相關函數
    function openSettingsModal() {
        settingsModal.classList.add('active');
    }
    
    function closeSettingsModal() {
        settingsModal.classList.remove('active');
    }
    
    function saveSettings() {
        apiKey = apiKeyInput.value.trim();
        
        // 儲存API密鑰到本地存儲
        if (apiKey) {
            localStorage.setItem('openai_api_key', apiKey);
            showToast('設定已保存', 'success');
        } else {
            localStorage.removeItem('openai_api_key');
            showToast('API密鑰已清除', 'warning');
        }
        
        updateUIBasedOnAPIKey();
        closeSettingsModal();
    }
    
    function updateUIBasedOnAPIKey() {
        // 更新UI以反映是否有API密鑰
        if (apiKey) {
            settingsBtn.innerHTML = '<i class="fas fa-cog"></i>';
            settingsBtn.classList.add('has-key');
        } else {
            settingsBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
            settingsBtn.classList.remove('has-key');
            showToast('請先設定OpenAI API密鑰', 'warning');
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
    
    // 上傳相關函數
    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.match('image.*')) {
            showToast('請上傳圖片檔案', 'error');
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
            showToast('請上傳圖片檔案', 'error');
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
        // 檢查API密鑰
        if (!apiKey) {
            showToast('請先設定OpenAI API密鑰', 'error');
            openSettingsModal();
            return;
        }
        
        // 顯示加載中狀態
        showLoading('正在處理圖片...');
        
        // 清空預覽區域
        imagePreview.innerHTML = '';
        
        // 創建圖片元素並加入預覽區
        const reader = new FileReader();
        reader.onload = async function(e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            imagePreview.appendChild(img);
            
            // 保存圖片數據
            uploadedImageSrc = e.target.result;
            
            // 禁用上傳區域
            disableUploadArea();
            
            // 重置解析狀態
            resetParsingState();
            
            // 自動解析圖片
            await parseImageRules(img.src);
        };
        
        reader.readAsDataURL(file);
    }
    
    function disableUploadArea() {
        uploadArea.classList.add('disabled');
        ruleImageInput.classList.add('disabled');
        uploadStatus.textContent = '圖片已上傳，如需更換請點擊下方重設按鈕';
        uploadStatus.classList.add('success');
        uploadStatus.style.display = 'block';
        
        // 顯示重設按鈕
        resetUploadBtn.style.display = 'flex';
    }
    
    function resetParsingState() {
        parsedParkingRules = null;
        dynamicCalculatorFunction = null;
        calculatorFunctionCode = '';
    }
    
    // 時間相關函數
    function setCurrentDateTime() {
        const now = new Date();
        
        // 設定入場時間為現在
        entryDateInput.value = formatDateForInput(now, 'date');
        entryTimeInput.value = formatDateForInput(now, 'time');
        
        // 設定出場時間為現在加一小時
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        exitDateInput.value = formatDateForInput(oneHourLater, 'date');
        exitTimeInput.value = formatDateForInput(oneHourLater, 'time');
        
        validateDateTimes();
    }
    
    function addOneHour() {
        // 獲取當前出場時間
        const exitDateTime = getCombinedDateTime(exitDateInput.value, exitTimeInput.value);
        
        // 加一小時
        const newExitTime = new Date(exitDateTime.getTime() + 60 * 60 * 1000);
        
        // 更新輸入框
        exitDateInput.value = formatDateForInput(newExitTime, 'date');
        exitTimeInput.value = formatDateForInput(newExitTime, 'time');
        
        validateDateTimes();
    }
    
    function validateDateTimes() {
        const entryDateTime = getCombinedDateTime(entryDateInput.value, entryTimeInput.value);
        const exitDateTime = getCombinedDateTime(exitDateInput.value, exitTimeInput.value);
        
        if (exitDateTime <= entryDateTime) {
            calculateBtn.disabled = true;
            showToast('出場時間必須晚於入場時間', 'error');
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
    
    // 解析圖片規則相關函數
    async function parseImageRules(imageSrc) {
        try {
            // 獲取圖片的base64編碼（去除data:image/jpeg;base64,前綴）
            const imgBase64 = imageSrc.split(',')[1];
            
            // 更新加載消息
            updateLoadingMessage('正在解析停車費規則...');
            
            // 準備發送到OpenAI API的數據
            const payload = {
                model: "o4-mini",
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "這是一張停車場收費規則的圖片。請仔細分析圖片中的停車費率規則，並以結構化JSON格式提取以下信息：\n1. 基本費率（每小時或每次收費）\n2. 時段差異（如有不同時段不同費率）\n3. 特殊優惠（如首小時優惠等）\n4. 一天封頂費用（如有）\n5. 不同車型費率差異（如有）\n\n請僅返回JSON格式數據，不要有任何其他文字。JSON結構應該包含至少一個計費規則，每個規則應該有費率、適用時段、車型等信息。"
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

            // 發送請求到OpenAI API
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
                throw new Error(`API錯誤: ${errorData.error?.message || '未知錯誤'}`);
            }

            const data = await response.json();
            let content = data.choices[0].message.content;
            
            // 嘗試從回應中提取JSON
            let jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                           content.match(/{[\s\S]*}/);
            
            let parsedJson;
            if (jsonMatch) {
                try {
                    parsedJson = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                } catch (e) {
                    throw new Error('無法解析JSON回應');
                }
            } else {
                try {
                    // 嘗試直接解析整個回應
                    parsedJson = JSON.parse(content);
                } catch (e) {
                    throw new Error('回應不包含有效的JSON格式');
                }
            }
            
            // 存儲解析後的規則
            parsedParkingRules = parsedJson;
            
            // 保存到本地儲存
            localStorage.setItem('parking_calculator_rules', JSON.stringify(parsedParkingRules));

            // 生成計算函數
            await generateCalculatorFunction(parsedParkingRules);
            
        } catch (error) {
            console.error('解析錯誤:', error);
            uploadStatus.textContent = '圖片解析失敗，請點擊下方重設按鈕重新嘗試';
            uploadStatus.classList.remove('success');
            uploadStatus.classList.add('error');
            hideLoading();
        }
    }
    
    // 使用OpenAI生成計算函數
    async function generateCalculatorFunction(rules) {
        try {
            // 更新加載消息
            updateLoadingMessage('正在生成計算函數...');
            
            // 準備發送到OpenAI API的數據
            const payload = {
                model: "o4-mini",
                messages: [
                    {
                        role: "system",
                        content: "你是一個專業的JavaScript程式設計師，精通停車費計算邏輯。請根據提供的停車費規則JSON，生成一個名為calculateFee的JavaScript函數，該函數接收入場時間(entryTime)和出場時間(exitTime)兩個參數(均為JavaScript Date物件)，並返回計算出的停車費用。函數需要精確實現提供的規則，處理各種時間段和特殊情況。只返回函數代碼，不要有任何其他說明文字或代碼塊標記。函數必須完整、有效，並且能夠正確執行。"
                    },
                    {
                        role: "user",
                        content: `根據以下停車費規則JSON，生成計算停車費的JavaScript函數：\n\n${JSON.stringify(rules, null, 2)}\n\n請確保函數能夠準確處理所有規則和條件，僅返回完整的函數代碼，不要有markdown代碼塊標記，也不要有任何額外解釋。`
                    }
                ]
            };

            // 發送請求到OpenAI API
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
                throw new Error(`API錯誤: ${errorData.error?.message || '未知錯誤'}`);
            }

            const data = await response.json();
            let functionCode = data.choices[0].message.content;
            
            // 清理代碼，移除所有markdown代碼塊標記
            functionCode = functionCode.replace(/```(?:javascript|js)?/g, '').replace(/```/g, '').trim();
            
            // 確保代碼是完整的函數定義
            if (!functionCode.startsWith('function calculateFee')) {
                // 嘗試查找函數定義
                const funcMatch = functionCode.match(/function\s+calculateFee[\s\S]*?}/);
                if (funcMatch) {
                    functionCode = funcMatch[0];
                } else {
                    throw new Error('無法從回應中提取有效的calculateFee函數');
                }
            }
            
            // 檢查函數結構完整性（簡單檢查，確保函數有開始和結束）
            const openBraces = (functionCode.match(/{/g) || []).length;
            const closeBraces = (functionCode.match(/}/g) || []).length;
            
            if (openBraces !== closeBraces) {
                throw new Error(`函數代碼大括號不匹配: 開始 ${openBraces} 個, 結束 ${closeBraces} 個`);
            }
            
            console.log('準備評估的函數代碼:', functionCode);
            
            // 保存函數代碼
            calculatorFunctionCode = functionCode;
            
            // 使用更安全的方式創建函數
            try {
                // 將函數包裝在一個立即執行的函數表達式中進行測試
                const testFunction = new Function(`
                    try {
                        ${functionCode}
                        return true;
                    } catch (e) {
                        throw new Error("函數語法錯誤: " + e.message);
                    }
                `);
                
                // 執行測試
                testFunction();
                
                // 如果通過測試，創建真正的函數
                dynamicCalculatorFunction = new Function('entryTime', 'exitTime', `
                    ${functionCode}
                    try {
                        return calculateFee(entryTime, exitTime);
                    } catch (e) {
                        console.error("計算函數執行錯誤:", e);
                        throw e;
                    }
                `);
                
                console.log('動態計算函數已生成');
                
                // 測試函數可用性
                const testEntry = new Date();
                const testExit = new Date(testEntry.getTime() + 60 * 60 * 1000); // 1小時後
                try {
                    const testFee = dynamicCalculatorFunction(testEntry, testExit);
                    console.log('函數測試結果:', testFee);
                    
                    // 保存函數代碼到本地儲存
                    localStorage.setItem('parking_calculator_function', calculatorFunctionCode);
                    
                    // 保存所有數據
                    saveToLocalStorage();
                    
                    // 啟用計算按鈕
                    calculateBtn.disabled = false;
                    
                    // 更新上傳狀態
                    uploadStatus.textContent = '圖片已成功解析，可以進行計算';
                    uploadStatus.classList.add('success');
                    
                    // 顯示成功提示
                    showToast('解析成功，請設定時間並計算', 'success');
                } catch (testError) {
                    console.warn('函數測試警告:', testError.message);
                    throw testError;
                }
            } catch (evalError) {
                console.error('函數評估錯誤:', evalError);
                throw new Error(`無法創建計算函數: ${evalError.message}`);
            }
            
            // 隱藏加載指示器
            hideLoading();
        } catch (error) {
            console.error('生成計算函數錯誤:', error);
            uploadStatus.textContent = '計算函數生成失敗，請點擊下方重設按鈕重新嘗試';
            uploadStatus.classList.remove('success');
            uploadStatus.classList.add('error');
            
            // 失敗時，確保動態計算函數設為null
            dynamicCalculatorFunction = null;
            calculatorFunctionCode = '';
            
            // 隱藏加載指示器
            hideLoading();
        }
    }
    
    // 計算停車費
    function calculateParkingFee() {
        // 獲取入場和出場時間
        const entryDateTime = getCombinedDateTime(entryDateInput.value, entryTimeInput.value);
        const exitDateTime = getCombinedDateTime(exitDateInput.value, exitTimeInput.value);
        
        // 檢查時間是否有效
        if (isNaN(entryDateTime.getTime()) || isNaN(exitDateTime.getTime())) {
            showToast('請輸入有效的時間', 'error');
            return;
        }
        
        // 檢查出場時間是否早於入場時間
        if (exitDateTime <= entryDateTime) {
            showToast('出場時間必須晚於入場時間', 'error');
            return;
        }
        
        // 計算停車時長（毫秒）
        const parkingDuration = exitDateTime - entryDateTime;
        
        // 將毫秒轉換為小時和分鐘
        const hours = Math.floor(parkingDuration / (1000 * 60 * 60));
        const minutes = Math.floor((parkingDuration % (1000 * 60 * 60)) / (1000 * 60));
        
        let fee = 0;
        let calculationMethod = '';
        
        // 檢查是否有動態生成的計算函數
        if (dynamicCalculatorFunction) {
            try {
                console.log('正在使用動態生成的計算函數...');
                fee = dynamicCalculatorFunction(entryDateTime, exitDateTime);
                calculationMethod = '使用AI生成的專用計算函數';
                console.log('使用動態生成的計算函數計算費用:', fee);
            } catch (error) {
                console.error('動態計算函數錯誤:', error);
                // 如果動態函數失敗，提示用戶
                showToast(`計算錯誤: ${error.message}。請重新解析圖片。`, 'error');
                return;
            }
        } else {
            // 如果沒有動態生成的函數，提示用戶需要先解析圖片
            if (parsedParkingRules) {
                showToast('請先等待AI完成計算函數生成，或重新解析圖片。', 'warning');
            } else {
                showToast('請先上傳並解析停車費規則圖片。', 'warning');
            }
            return;
        }
        
        // 顯示結果，包括使用的計算方法
        feeResult.innerHTML = `
            <div class="fee-detail">
                <div class="fee-time">
                    <i class="fas fa-clock"></i> 停車時間：${hours}小時${minutes}分鐘
                </div>
                <div class="fee-amount">
                    <i class="fas fa-dollar-sign"></i> 預估費用：${fee}元
                </div>
                <div class="fee-method">
                    <i class="fas fa-info-circle"></i> ${calculationMethod}
                </div>
            </div>
        `;
    }
    
    // 工具函數
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
        // 創建吐司元素
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // 添加圖標
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
        
        // 添加到文檔中
        document.body.appendChild(toast);
        
        // 顯示吐司
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // 關閉按鈕事件
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        });
        
        // 自動關閉
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