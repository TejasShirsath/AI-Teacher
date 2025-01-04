const API_KEY = process.env.API_KEY;
        const API_VERSION = 'v1beta';
        const MODEL_NAME = 'gemini-1.5-flash';
        const API_ENDPOINT = `https://generativelanguage.googleapis.com/${API_VERSION}/models/${MODEL_NAME}:generateContent`;
        
        let stream;
        let photoBlob;

        async function checkPermissions() {
            try {
                const permission = await navigator.permissions.query({ name: 'camera' });
                
                if (permission.state === 'granted') {
                    showStep(1);
                    startCamera();
                }

                permission.addEventListener('change', () => {
                    if (permission.state === 'granted') {
                        showStep(1);
                        startCamera();
                    }
                });
            } catch (error) {
                console.error('Permission check error:', error);
            }
        }

        async function requestPermissions() {
            try {
                const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                videoStream.getTracks().forEach(track => track.stop());
                showStep(1);
                startCamera();
            } catch (err) {
                console.error('Permission error:', err);
                showError('Please grant camera permissions to use this app.');
            }
        }

        async function startCamera() {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');

                let constraints = {
                    video: true
                };

                if (videoDevices.length > 0) {
                    const backCamera = videoDevices.find(device =>
                        device.label.toLowerCase().includes('back') ||
                        device.label.toLowerCase().includes('rear') ||
                        device.label.toLowerCase().includes('environment')
                    );

                    if (backCamera) {
                        constraints.video = {
                            deviceId: { exact: backCamera.deviceId },
                            facingMode: 'environment'
                        };
                    }
                }

                stream = await navigator.mediaDevices.getUserMedia(constraints);
                const video = document.getElementById('video');
                video.srcObject = stream;
            } catch (err) {
                console.error('Error accessing camera:', err);
                showError('Error accessing camera. Please check permissions.');
            }
        }

        function showStep(stepNumber) {
            document.querySelectorAll('.step').forEach(step => {
                step.classList.remove('active');
            });
            document.getElementById(`step${stepNumber}`).classList.add('active');
        }

        async function processImage(imageData) {
            showSpinner();
            hideError();

            try {
                const requestBody = {
                    contents: [{
                        parts: [{
                            text: "Please solve this math problem and provide a step-by-step solution:"
                        }, {
                            inlineData: {
                                mimeType: "image/jpeg",
                                data: imageData.split(',')[1]
                            }
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.4,
                        topK: 32,
                        topP: 1,
                        maxOutputTokens: 2048,
                    }
                };

                const response = await fetch(`${API_ENDPOINT}?key=${API_KEY}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
                }

                const data = await response.json();
                if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                    displayResult(imageData, data.candidates[0].content.parts[0].text);
                    showStep(3);
                } else {
                    throw new Error('Invalid response format from API');
                }
            } catch (err) {
                showError(`Error: ${err.message}`);
            } finally {
                hideSpinner();
            }
        }

        // Utility functions
        function showSpinner() {
            document.getElementById('spinner').style.display = 'block';
        }

        function hideSpinner() {
            document.getElementById('spinner').style.display = 'none';
        }

        function showError(message) {
            const errorMessage = document.getElementById('errorMessage');
            errorMessage.textContent = message;
            errorMessage.classList.remove('hidden');
        }

        function hideError() {
            document.getElementById('errorMessage').classList.add('hidden');
        }

        function displayResult(imageData, solutionText) {
            document.getElementById('capturedImage').src = imageData;
            document.getElementById('solution').textContent = solutionText;
        }

        // Event Listeners
        document.getElementById('grantPermissions').addEventListener('click', requestPermissions);
        
        document.getElementById('captureBtn').addEventListener('click', () => {
            const canvas = document.getElementById('canvas');
            const video = document.getElementById('video');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
            
            canvas.toBlob((blob) => {
                photoBlob = blob;
                const reader = new FileReader();
                reader.onloadend = () => {
                    const imageData = reader.result;
                    document.getElementById('photoPreview').src = imageData;
                    document.getElementById('video').style.display = 'none';
                    document.getElementById('photoPreview').classList.remove('hidden');
                    
                    if (stream) {
                        stream.getTracks().forEach(track => track.stop());
                    }
                    
                    showStep(2);
                };
                reader.readAsDataURL(blob);
            }, 'image/jpeg');
        });

        document.getElementById('uploadBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        document.getElementById('fileInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('photoPreview').src = e.target.result;
                    document.getElementById('video').style.display = 'none';
                    document.getElementById('photoPreview').classList.remove('hidden');
                    showStep(2);
                };
                reader.readAsDataURL(file);
            }
        });

        document.getElementById('processButton').addEventListener('click', () => {
            const imageData = document.getElementById('photoPreview').src;
            processImage(imageData);
        });

        document.getElementById('startOver').addEventListener('click', () => {
            location.reload();
        });

        // Initialize the app
        checkPermissions();
