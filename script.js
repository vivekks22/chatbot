document.addEventListener('DOMContentLoaded', () => {
    const chatbox = document.getElementById("chatbox");
    const messageInput = document.getElementById("messageInput");
    const sendButton = document.getElementById("sendButton");
    const voiceButton = document.getElementById("voiceButton");
    const imageUpload = document.getElementById("imageUpload");
    const uploadButton = document.getElementById("uploadButton");
    const chatId = crypto.randomUUID();

    let receiving = false;
    let accumulatedMessage = ""; // To accumulate the message if split

    const systemPrompt = "Hello! I'm your assistant. How can I help you today?";

    function createMessageElement(text, alignment) {
        const messageElement = document.createElement("div");
        messageElement.className = `message ${alignment === "left" ? "bot" : "user"}`;
        
        // Apply HTML formatting to the text for proper indentation
        const formattedText = text
            .replace(/\n/g, '<br>') // Replace newlines with <br> for line breaks
            .replace(/ {4}/g, '&nbsp;&nbsp;&nbsp;&nbsp;'); // Replace 4 spaces with non-breaking spaces
        messageElement.innerHTML = formattedText;
        
        return messageElement;
    }

    function createImageElement(imageSrc, alignment) {
        const messageElement = document.createElement("div");
        messageElement.className = `message ${alignment === "left" ? "bot" : "user"}`;

        const img = document.createElement("img");
        img.src = imageSrc;
        img.style.maxWidth = "100%"; // Make sure the image doesn't overflow
        img.style.height = "auto";

        messageElement.appendChild(img);
        return messageElement;
    }

    function connectWebSocket(message) {
        receiving = true;
        const url = "wss://backend.buildpicoapps.com/api/chatbot/chat";
        const websocket = new WebSocket(url);

        websocket.addEventListener("open", () => {
            const data = { chatId, appId: "others-enjoy", systemPrompt, message };
            websocket.send(JSON.stringify(data));
        });

        const messageElement = createMessageElement("...", "left");
        chatbox.appendChild(messageElement);

        websocket.onmessage = (event) => {
            accumulatedMessage += event.data; // Accumulate message data
            messageElement.innerHTML = accumulatedMessage
                .replace(/\n/g, '<br>') // Replace newlines with <br> for line breaks
                .replace(/ {4}/g, '&nbsp;&nbsp;&nbsp;&nbsp;'); // Replace 4 spaces with non-breaking spaces
            chatbox.scrollTop = chatbox.scrollHeight;
        };

        websocket.onclose = (event) => {
            if (event.code !== 1000) {
                messageElement.innerHTML = "Error getting response from server. Refresh the page and try again.";
            }
            chatbox.scrollTop = chatbox.scrollHeight;
            receiving = false;
            accumulatedMessage = ""; // Reset for next message
        };
    }

    sendButton.addEventListener("click", () => {
        if (!receiving && messageInput.value.trim()) {
            const messageText = messageInput.value.trim();
            messageInput.value = "";
            const messageElement = createMessageElement(messageText, "right");
            chatbox.appendChild(messageElement);
            chatbox.scrollTop = chatbox.scrollHeight;
            connectWebSocket(messageText);
        }
    });

    messageInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !receiving && messageInput.value.trim()) {
            event.preventDefault();
            sendButton.click();
        }
    });

    uploadButton.addEventListener("click", () => {
        imageUpload.click(); // Trigger file input click
    });

    imageUpload.addEventListener("change", () => {
        const imageFile = imageUpload.files[0];

        if (!imageFile) {
            return alert("Please select an image to upload");
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const imageData = event.target.result;
            const messageElement = createImageElement(imageData, "right");
            chatbox.appendChild(messageElement);
            chatbox.scrollTop = chatbox.scrollHeight;

            // Use Tesseract.js to convert image to text if needed
            Tesseract.recognize(
                imageData,
                'eng',
                { logger: info => console.log(info) } // Log progress
            ).then(({ data: { text } }) => {
                connectWebSocket(text); // Optionally send the OCR text to the WebSocket
            }).catch(err => {
                console.error("Error during OCR: ", err);
                // Handle OCR error if needed
            });
        };
        reader.readAsDataURL(imageFile);
    });

    function welcomeMessageFirstTime() {
        const welcomeMessage = "Hello! I'm your assistant. How can I help you today?";
        const messageElement = createMessageElement(welcomeMessage, "left");
        chatbox.appendChild(messageElement);
    }

    function speakText(text) {
        const speech = new SpeechSynthesisUtterance(text);
        speech.lang = "en-US";
        window.speechSynthesis.speak(speech);
    }

    voiceButton.addEventListener("click", () => {
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = "en-US";
        recognition.start();
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            messageInput.value = transcript;
            sendButton.click();
        };
    });

    welcomeMessageFirstTime();
});