// Main JavaScript file for LexAssist

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize popovers
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            if (this.getAttribute('href') !== '#') {
                e.preventDefault();
                document.querySelector(this.getAttribute('href')).scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // File upload form handling
    const uploadForm = document.getElementById('upload-form');
    const progressBar = document.querySelector('.upload-progress');
    
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            const fileInput = document.getElementById('document');
            
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                
                // Check file size
                if (file.size > 16 * 1024 * 1024) {
                    e.preventDefault();
                    alert('File size exceeds the 16MB limit. Please select a smaller file.');
                    return false;
                }
                
                // Show progress bar
                progressBar.classList.remove('d-none');
                progressBar.querySelector('.progress-bar').style.width = '0%';
                
                // Simulating upload progress
                let progress = 0;
                const interval = setInterval(() => {
                    progress += 5;
                    if (progress <= 90) {
                        progressBar.querySelector('.progress-bar').style.width = progress + '%';
                    } else {
                        clearInterval(interval);
                    }
                }, 200);
            }
        });
    }

    // Back button for document view
    const backButton = document.getElementById('back-to-documents');
    if (backButton) {
        backButton.addEventListener('click', function() {
            // Switch to documents tab
            document.getElementById('documents-tab').click();
        });
    }

    // Handle form validation styles
    document.querySelectorAll('form').forEach(form => {
        // Add was-validated class when form is submitted
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });
});

// Helper Functions

// Format timestamp to human-readable format
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Show loading indicator
function showLoading(element, text = 'Loading...') {
    element.innerHTML = `
        <div class="loading-placeholder">
            <div class="text-center">
                <div class="loading-spinner mb-2"></div>
                <p class="text-muted">${text}</p>
            </div>
        </div>
    `;
}

// Show error message
function showError(element, message) {
    element.innerHTML = `
        <div class="alert alert-danger" role="alert">
            <i class="fas fa-exclamation-circle me-2"></i>${message}
        </div>
    `;
}

// Create HTML for message
function createMessageHTML(content, isUser, timestamp) {
    const messageClass = isUser ? 'message-user' : 'message-ai';
    const icon = isUser ? 
        '<i class="fas fa-user me-2"></i>' : 
        '<i class="fas fa-balance-scale me-2"></i>';
    const time = formatTimestamp(timestamp || new Date());
    
    return `
        <div class="message ${messageClass}">
            <div class="message-content">
                ${icon}${content}
            </div>
            <div class="message-time">${time}</div>
        </div>
    `;
}

// Escape HTML to prevent XSS
function escapeHTML(string) {
    const element = document.createElement('div');
    element.textContent = string;
    return element.innerHTML;
}
