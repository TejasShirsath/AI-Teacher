require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// Constants
const API_VERSION = 'v1beta';
const MODEL_NAME = 'gemini-1.5-flash';
const API_ENDPOINT = `https://generativelanguage.googleapis.com/${API_VERSION}/models/${MODEL_NAME}:generateContent`;

// Middleware
app.use(cors());  // Enable CORS for all origins
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Handle OPTIONS requests for preflight
app.options('*', cors());  // Preflight handling for all routes

// Route to handle image processing
app.post('/api/process-image', async (req, res) => {
    try {
        const imageData = req.body.image;
        
        // Validate input
        if (!imageData) {
            return res.status(400).json({ message: 'No image data provided' });
        }

        // Extract base64 data
        const base64Data = imageData.split(',')[1];

        const requestBody = {
            contents: [{
                parts: [{
                    text: "Please solve this math problem and provide a step-by-step solution:"
                }, {
                    inlineData: {
                        mimeType: "image/jpeg",
                        data: base64Data
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

        const response = await fetch(`${API_ENDPOINT}?key=${process.env.API_KEY}`, {
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
            res.json({ 
                success: true, 
                solution: data.candidates[0].content.parts[0].text 
            });
        } else {
            throw new Error('Invalid response format from Gemini API');
        }

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error processing image',
            error: error.message 
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'Something went wrong!',
        error: err.message 
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
