// Chat functionality for LexAssist

document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const chatMessages = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message');
    const chatSessionId = document.getElementById('chat-session-id');
    const chatTitle = document.getElementById('chat-title');
    const chatList = document.querySelector('.chat-list');
    const newChatBtn = document.getElementById('new-chat-btn');
    const renameChatBtn = document.querySelector('.rename-chat');
    const deleteChatBtn = document.querySelector('.delete-chat');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const chatTitleInput = document.getElementById('chat-title-input');
    const saveChatTitleBtn = document.getElementById('save-chat-title');
    
    // Bootstrap modals
    const renameChatModal = new bootstrap.Modal(document.getElementById('renameChatModal'));
    const deleteConfirmModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
    
    // Variables
    let currentChatSession = null;
    let deleteType = null;
    let deleteTarget = null;
    
    // Initialize chat
    initChat();
    
    // Initialize events
    function initChat() {
        // Chat form submission
        if (chatForm) {
            chatForm.addEventListener('submit', handleChatSubmit);
        }
        
        // New chat button click
        if (newChatBtn) {
            newChatBtn.addEventListener('click', createNewChat);
        }
        
        // Rename chat button click
        if (renameChatBtn) {
            renameChatBtn.addEventListener('click', function() {
                if (currentChatSession) {
                    chatTitleInput.value = chatTitle.textContent;
                    renameChatModal.show();
                } else {
                    alert('Please select a chat session first');
                }
            });
        }
        
        // Delete chat button click
        if (deleteChatBtn) {
            deleteChatBtn.addEventListener('click', function() {
                if (currentChatSession) {
                    deleteType = 'chat';
                    deleteTarget = currentChatSession;
                    document.getElementById('delete-confirm-text').textContent = 
                        'Are you sure you want to delete this chat session? This action cannot be undone.';
                    deleteConfirmModal.show();
                } else {
                    alert('Please select a chat session first');
                }
            });
        }
        
        // Save chat title button click
        if (saveChatTitleBtn) {
            saveChatTitleBtn.addEventListener('click', renameChatSession);
        }
        
        // Confirm delete button click
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', handleDeleteConfirm);
        }
        
        // Initialize chat session items
        document.querySelectorAll('.chat-session-item').forEach(item => {
            item.addEventListener('click', function() {
                loadChatSession(this.getAttribute('data-session-id'));
            });
        });
        
        // If URL has chat session ID, load it
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        if (sessionId) {
            loadChatSession(sessionId);
        } else if (document.querySelector('.chat-session-item')) {
            // Load first chat session if exists
            document.querySelector('.chat-session-item').click();
        } else {
            // Show empty chat state
            chatMessages.innerHTML = `
                <div class="text-center my-5 empty-chat-message">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="text-secondary mb-3">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <h5>Start a New Conversation</h5>
                    <p class="text-muted">Ask any legal question and get an instant response from our AI legal assistant.</p>
                </div>
            `;
        }
    }
    
    // Handle chat form submission
    function handleChatSubmit(e) {
        e.preventDefault();
        
        const message = messageInput.value.trim();
        if (!message) return;
        
        // If no chat session yet, create one
        if (!currentChatSession) {
            createNewChat(function() {
                sendChatMessage(message);
            });
        } else {
            sendChatMessage(message);
        }
    }
    
    // Send chat message
    function sendChatMessage(message) {
        // Clear input
        messageInput.value = '';
        
        // Add user message to UI
        appendMessage(message, true);
        
        // Show AI thinking indicator
        showThinkingIndicator();
        
        // Send message to server
        // Create a FormData object for the message
        const formData = new FormData();
        formData.append('message', message);
        
        // Include CSRF token if it exists
        const csrfToken = document.querySelector('input[name="csrf_token"]');
        if (csrfToken) {
            formData.append('csrf_token', csrfToken.value);
        }
        
        fetch(`/chat/${currentChatSession}/send`, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Remove thinking indicator
            removeThinkingIndicator();
            
            // Add AI response to UI
            appendMessage(data.ai_response, false);
            
            // Scroll to bottom
            scrollToBottom();
        })
        .catch(error => {
            console.error('Error:', error);
            removeThinkingIndicator();
            appendErrorMessage('Failed to get response. Please try again.');
        });
    }
    
    // Create new chat session
    function createNewChat(callback) {
        // Use a form-based approach for better CSRF handling
        const formData = new FormData();
        
        // Get CSRF token if available
        const csrfToken = document.querySelector('input[name="csrf_token"]');
        if (csrfToken) {
            formData.append('csrf_token', csrfToken.value);
        }
        
        fetch('/chat/new', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            currentChatSession = data.session_id;
            chatSessionId.value = data.session_id;
            chatTitle.textContent = data.title;
            
            // Clear chat messages
            chatMessages.innerHTML = '';
            
            // Add new chat to the sidebar
            if (chatList) {
                const newChatItem = document.createElement('a');
                newChatItem.href = '#';
                newChatItem.className = 'list-group-item list-group-item-action chat-session-item py-2 active';
                newChatItem.setAttribute('data-session-id', data.session_id);
                newChatItem.setAttribute('data-bs-toggle', 'pill');
                newChatItem.setAttribute('data-bs-target', '#chat-content');
                
                const now = new Date();
                newChatItem.innerHTML = `
                    <div class="d-flex w-100 justify-content-between">
                        <div class="text-truncate">
                            <i class="fas fa-comments me-2 text-primary"></i>
                            ${data.title}
                        </div>
                        <small class="text-muted ms-2">${now.toLocaleDateString()}</small>
                    </div>
                `;
                
                // Add click event listener
                newChatItem.addEventListener('click', function() {
                    loadChatSession(data.session_id);
                });
                
                // Add to the beginning of the list
                chatList.prepend(newChatItem);
                
                // Remove placeholder text if any
                const placeholder = chatList.querySelector('p.text-muted');
                if (placeholder) {
                    placeholder.remove();
                }
                
                // Mark this chat as active
                document.querySelectorAll('.chat-session-item').forEach(item => {
                    item.classList.remove('active');
                });
                newChatItem.classList.add('active');
            }
            
            // Show empty chat message
            chatMessages.innerHTML = `
                <div class="text-center my-5 empty-chat-message">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="text-secondary mb-3">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <h5>New Conversation Started</h5>
                    <p class="text-muted">Ask any legal question and get an instant response from our AI legal assistant.</p>
                </div>
            `;
            
            // Execute callback if provided
            if (typeof callback === 'function') {
                callback();
            }
        })
        .catch(error => {
            console.error('Error creating new chat:', error);
            alert('Failed to create new chat session. Please try again.');
        });
    }
    
    // Load chat session
    function loadChatSession(sessionId) {
        if (!sessionId) return;
        
        // Show loading indicator
        showLoading(chatMessages, 'Loading chat history...');
        
        fetch(`/chat/${sessionId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Update current chat session
                currentChatSession = data.session_id;
                chatSessionId.value = data.session_id;
                chatTitle.textContent = data.title;
                
                // Mark active chat in sidebar
                document.querySelectorAll('.chat-session-item').forEach(item => {
                    item.classList.remove('active');
                    if (item.getAttribute('data-session-id') == sessionId) {
                        item.classList.add('active');
                    }
                });
                
                // Clear chat messages
                chatMessages.innerHTML = '';
                
                // Add messages
                if (data.messages.length === 0) {
                    // Show empty chat message
                    chatMessages.innerHTML = `
                        <div class="text-center my-5 empty-chat-message">
                            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="text-secondary mb-3">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                            <h5>Start Your Conversation</h5>
                            <p class="text-muted">Ask any legal question and get an instant response from our AI legal assistant.</p>
                        </div>
                    `;
                } else {
                    data.messages.forEach(message => {
                        appendMessage(message.content, message.is_user, new Date(message.timestamp));
                    });
                    
                    // Scroll to bottom
                    scrollToBottom();
                }
            })
            .catch(error => {
                console.error('Error loading chat session:', error);
                showError(chatMessages, 'Failed to load chat history. Please try again.');
            });
    }
    
    // Rename chat session
    function renameChatSession() {
        const newTitle = chatTitleInput.value.trim();
        if (!newTitle || !currentChatSession) return;
        
        fetch(`/chat/${currentChatSession}/rename`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title: newTitle })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Update title in UI
            chatTitle.textContent = newTitle;
            
            // Update title in sidebar
            document.querySelectorAll('.chat-session-item').forEach(item => {
                if (item.getAttribute('data-session-id') == currentChatSession) {
                    const titleElement = item.querySelector('.text-truncate');
                    titleElement.innerHTML = `<i class="fas fa-comments me-2 text-primary"></i>${newTitle}`;
                }
            });
            
            // Close modal
            renameChatModal.hide();
        })
        .catch(error => {
            console.error('Error renaming chat session:', error);
            alert('Failed to rename chat session. Please try again.');
        });
    }
    
    // Handle delete confirm
    function handleDeleteConfirm() {
        if (deleteType === 'chat' && deleteTarget) {
            deleteChatSession(deleteTarget);
        }
        
        deleteConfirmModal.hide();
    }
    
    // Delete chat session
    function deleteChatSession(sessionId) {
        // Create form data for the request
        const formData = new FormData();
        
        // Include CSRF token if it exists
        const csrfToken = document.querySelector('input[name="csrf_token"]');
        if (csrfToken) {
            formData.append('csrf_token', csrfToken.value);
        }
        
        fetch(`/chat/${sessionId}/delete`, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Remove from sidebar
            document.querySelectorAll('.chat-session-item').forEach(item => {
                if (item.getAttribute('data-session-id') == sessionId) {
                    item.remove();
                }
            });
            
            // If this was the current chat, clear UI
            if (currentChatSession == sessionId) {
                currentChatSession = null;
                chatSessionId.value = '';
                chatTitle.textContent = 'Legal Chat';
                
                // Show empty chat state
                chatMessages.innerHTML = `
                    <div class="text-center my-5 empty-chat-message">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="text-secondary mb-3">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <h5>Start a New Conversation</h5>
                        <p class="text-muted">Ask any legal question and get an instant response from our AI legal assistant.</p>
                    </div>
                `;
            }
            
            // If no more chats, show placeholder
            if (document.querySelectorAll('.chat-session-item').length === 0) {
                chatList.innerHTML = '<p class="text-muted small">No chat sessions yet</p>';
            } else {
                // Select the first available chat
                document.querySelector('.chat-session-item').click();
            }
        })
        .catch(error => {
            console.error('Error deleting chat session:', error);
            alert('Failed to delete chat session. Please try again.');
        });
    }
    
    // Append message to chat
    function appendMessage(content, isUser, timestamp = new Date()) {
        // Check if the first message, remove empty state if exists
        const emptyState = chatMessages.querySelector('.empty-chat-message');
        if (emptyState) {
            emptyState.remove();
        }
        
        // Create message element
        const messageHTML = createMessageHTML(content, isUser, timestamp);
        
        // Append to chat
        chatMessages.insertAdjacentHTML('beforeend', messageHTML);
        
        // Scroll to bottom
        scrollToBottom();
    }
    
    // Show "AI is thinking" indicator
    function showThinkingIndicator() {
        // Append thinking indicator
        chatMessages.insertAdjacentHTML('beforeend', `
            <div class="message message-ai thinking-indicator">
                <div class="message-content">
                    <i class="fas fa-balance-scale me-2"></i>
                    <span class="thinking-dots">Thinking<span>.</span><span>.</span><span>.</span></span>
                </div>
            </div>
        `);
        
        // Scroll to bottom
        scrollToBottom();
        
        // Animate thinking dots
        animateThinkingDots();
    }
    
    // Remove thinking indicator
    function removeThinkingIndicator() {
        const indicator = chatMessages.querySelector('.thinking-indicator');
        if (indicator) {
            indicator.remove();
        }
    }
    
    // Animate thinking dots
    function animateThinkingDots() {
        const dots = document.querySelectorAll('.thinking-dots span');
        let i = 0;
        
        const interval = setInterval(() => {
            dots.forEach((dot, index) => {
                dot.style.opacity = index === i % 3 ? '1' : '0.2';
            });
            i++;
            
            // Stop animation if indicator is gone
            if (!document.querySelector('.thinking-indicator')) {
                clearInterval(interval);
            }
        }, 300);
    }
    
    // Append error message
    function appendErrorMessage(message) {
        chatMessages.insertAdjacentHTML('beforeend', `
            <div class="alert alert-danger mx-auto my-2" style="max-width: 80%;">
                <i class="fas fa-exclamation-circle me-2"></i>${message}
            </div>
        `);
        
        // Scroll to bottom
        scrollToBottom();
    }
    
    // Scroll chat to bottom
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});
