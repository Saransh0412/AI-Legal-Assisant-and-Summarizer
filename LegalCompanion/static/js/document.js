// Document handling functionality for LexAssist

document.addEventListener('DOMContentLoaded', function() {
    // DOM elements - Document viewer
    const documentContent = document.getElementById('document-content');
    const documentSummary = document.getElementById('document-summary');
    const documentAnswer = document.getElementById('document-answer');
    const documentInfo = document.getElementById('document-info');
    const documentTitle = document.getElementById('document-title');
    const documentId = document.getElementById('document-id');
    const summarizeBtn = document.getElementById('summarize-btn');
    const documentQuestionForm = document.getElementById('document-question-form');
    const sessionIdField = document.getElementById('doc-session-id');
    
    // DOM elements - Document list
    const documentLinks = document.querySelectorAll('.document-link, .document-item, .view-document');
    const deleteDocumentBtns = document.querySelectorAll('.delete-document');
    
    // Bootstrap modals
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    
    // Variables
    let currentDocument = null;
    let deleteType = null;
    let deleteTarget = null;
    
    // Initialize document handling
    initDocumentHandling();
    
    function initDocumentHandling() {
        // Document link clicks
        documentLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const docId = this.getAttribute('data-document-id');
                loadDocument(docId);
            });
        });
        
        // Summarize button click
        if (summarizeBtn) {
            summarizeBtn.addEventListener('click', summarizeDocument);
        }
        
        // Document question form submission
        if (documentQuestionForm) {
            documentQuestionForm.addEventListener('submit', handleDocumentQuestion);
        }
        
        // Delete document buttons
        deleteDocumentBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const docId = this.getAttribute('data-document-id');
                const docName = findDocumentName(docId);
                
                deleteType = 'document';
                deleteTarget = docId;
                
                document.getElementById('delete-confirm-text').textContent = 
                    `Are you sure you want to delete the document "${docName}"? This action cannot be undone.`;
                
                const bsModal = new bootstrap.Modal(deleteConfirmModal);
                bsModal.show();
            });
        });
        
        // Confirm delete button click
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', handleDeleteConfirm);
        }
        
        // Check if URL has document ID
        const urlParams = new URLSearchParams(window.location.search);
        const docId = urlParams.get('document_id');
        if (docId) {
            loadDocument(docId);
            // Switch to document view
            document.querySelector('[data-bs-target="#document-view-content"]').click();
        } 
        
        // Check if there's an active document from server-side rendering
        const activeDocument = document.querySelector('.active-document');
        if (activeDocument) {
            currentDocument = activeDocument.getAttribute('data-document-id');
            // Switch to document view
            document.querySelector('[data-bs-target="#document-view-content"]').click();
        }
    }
    
    // Load document
    function loadDocument(docId) {
        if (!docId) return;
        
        // Update current document
        currentDocument = docId;
        
        // Update hidden field for Q&A form
        if (documentId) {
            documentId.value = docId;
        }
        
        // Show loading indicators
        showLoading(documentContent, 'Loading document content...');
        if (documentSummary) showLoading(documentSummary, 'Summary will appear here...');
        if (documentAnswer) documentAnswer.innerHTML = '<p class="text-muted text-center my-3">Ask a question to get an answer based on the document</p>';
        
        // Mark active document in sidebar
        document.querySelectorAll('.document-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-document-id') == docId) {
                item.classList.add('active');
            }
        });
        
        // Fetch document details
        fetch(`/document/${docId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Update document title
                if (documentTitle) {
                    documentTitle.textContent = data.original_filename;
                }
                
                // Update document info
                if (documentInfo) {
                    documentInfo.innerHTML = `
                        <div class="d-flex justify-content-between align-items-center">
                            <h5>${data.original_filename}</h5>
                            <span class="badge bg-secondary">${data.mime_type}</span>
                        </div>
                        <p class="text-muted mb-1">
                            <small>Size: ${(data.size / 1024).toFixed(2)} KB | Uploaded: ${new Date(data.uploaded_at).toLocaleString()}</small>
                        </p>
                    `;
                }
                
                // Update document content
                if (documentContent) {
                    documentContent.innerHTML = `<pre class="mb-0">${escapeHTML(data.content)}</pre>`;
                }
                
                // Update document summary tab
                if (documentSummary) {
                    if (data.summary) {
                        documentSummary.innerHTML = `<div>${data.summary.replace(/\n/g, '<br>')}</div>`;
                    } else {
                        documentSummary.innerHTML = `
                            <div class="text-center my-4">
                                <i class="fas fa-file-alt fa-3x text-secondary mb-3"></i>
                                <p>No summary generated yet. Click the Summarize button to create one.</p>
                            </div>
                        `;
                    }
                }
                
                // Enable summarize button if no summary exists
                if (summarizeBtn) {
                    summarizeBtn.disabled = false;
                    
                    if (data.summary) {
                        summarizeBtn.innerHTML = '<i class="fas fa-sync-alt me-1"></i>Regenerate Summary';
                    } else {
                        summarizeBtn.innerHTML = '<i class="fas fa-file-alt me-1"></i>Summarize';
                    }
                }
                
                // Update navigation - show summary tab if it exists, otherwise content tab
                if (data.summary) {
                    document.querySelector('#summary-tab').click();
                } else {
                    document.querySelector('#content-tab').click();
                }
            })
            .catch(error => {
                console.error('Error loading document:', error);
                showError(documentContent, 'Failed to load document. Please try again.');
                
                if (documentSummary) {
                    showError(documentSummary, 'Failed to load document.');
                }
            });
    }
    
    // Summarize document
    function summarizeDocument() {
        if (!currentDocument) return;
        
        // Show loading indicator
        showLoading(documentSummary, 'Generating summary...');
        
        // Disable summarize button
        if (summarizeBtn) {
            summarizeBtn.disabled = true;
            summarizeBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Summarizing...';
        }
        
        // Switch to summary tab
        document.querySelector('#summary-tab').click();
        
        // Create form data for the request
        const formData = new FormData();
        
        // Include CSRF token if it exists
        const csrfToken = document.querySelector('input[name="csrf_token"]');
        if (csrfToken) {
            formData.append('csrf_token', csrfToken.value);
        }
        
        // Fetch summary from server
        fetch(`/document/${currentDocument}/summarize`, {
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
            // Update summary content
            if (documentSummary) {
                documentSummary.innerHTML = `<div>${data.summary.replace(/\n/g, '<br>')}</div>`;
            }
            
            // Update button
            if (summarizeBtn) {
                summarizeBtn.disabled = false;
                summarizeBtn.innerHTML = '<i class="fas fa-sync-alt me-1"></i>Regenerate Summary';
            }
        })
        .catch(error => {
            console.error('Error summarizing document:', error);
            showError(documentSummary, 'Failed to generate summary. Please try again.');
            
            // Re-enable button
            if (summarizeBtn) {
                summarizeBtn.disabled = false;
                summarizeBtn.innerHTML = '<i class="fas fa-file-alt me-1"></i>Try Again';
            }
        });
    }
    
    // Handle document question form submission
    function handleDocumentQuestion(e) {
        e.preventDefault();
        
        if (!currentDocument) return;
        
        const questionInput = document.getElementById('question');
        const question = questionInput.value.trim();
        
        if (!question) return;
        
        // Show loading indicator
        showLoading(documentAnswer, 'Analyzing document...');
        
        // Create form data
        const formData = new FormData(documentQuestionForm);
        formData.append('document_id', currentDocument);
        
        // Send question to server
        fetch(`/document/${currentDocument}/ask`, {
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
            // Display answer
            documentAnswer.innerHTML = `
                <div class="mb-3">
                    <strong>Q: ${escapeHTML(question)}</strong>
                </div>
                <div>
                    <strong>A:</strong> ${data.answer.replace(/\n/g, '<br>')}
                </div>
            `;
            
            // Update session ID if provided
            if (data.session_id && sessionIdField) {
                sessionIdField.value = data.session_id;
            }
            
            // Clear question input
            questionInput.value = '';
        })
        .catch(error => {
            console.error('Error with document question:', error);
            showError(documentAnswer, 'Failed to process your question. Please try again.');
        });
    }
    
    // Handle delete confirmation
    function handleDeleteConfirm() {
        if (deleteType === 'document' && deleteTarget) {
            deleteDocument(deleteTarget);
        }
        
        // Hide modal
        const bsModal = bootstrap.Modal.getInstance(deleteConfirmModal);
        if (bsModal) bsModal.hide();
    }
    
    // Delete document
    function deleteDocument(docId) {
        // Create form data for the request
        const formData = new FormData();
        
        // Include CSRF token if it exists
        const csrfToken = document.querySelector('input[name="csrf_token"]');
        if (csrfToken) {
            formData.append('csrf_token', csrfToken.value);
        }
        
        fetch(`/document/${docId}/delete`, {
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
            // Remove document from UI
            document.querySelectorAll(`[data-document-id="${docId}"]`).forEach(element => {
                // If it's a table row, remove the whole row
                if (element.tagName === 'TR' || element.closest('tr')) {
                    const row = element.tagName === 'TR' ? element : element.closest('tr');
                    row.remove();
                } else {
                    element.remove();
                }
            });
            
            // If this was the current document, clear UI and switch to documents tab
            if (currentDocument == docId) {
                currentDocument = null;
                document.getElementById('documents-tab').click();
            }
            
            // If no more documents, show empty state
            const remainingDocs = document.querySelectorAll('.document-item, .document-link');
            if (remainingDocs.length === 0) {
                const documentsTable = document.querySelector('.table-responsive');
                if (documentsTable) {
                    documentsTable.innerHTML = `
                        <div class="text-center my-5">
                            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="text-secondary mb-3">
                                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                                <polyline points="13 2 13 9 20 9"></polyline>
                            </svg>
                            <h5>No Documents Yet</h5>
                            <p class="text-muted">Upload your first document to get started</p>
                            <a href="#upload-content" class="btn btn-primary mt-2" data-bs-toggle="pill" role="tab">
                                <i class="fas fa-upload me-2"></i>Upload Document
                            </a>
                        </div>
                    `;
                }
                
                // Update sidebar
                const docList = document.querySelector('.document-list');
                if (docList) {
                    docList.innerHTML = '<p class="text-muted small">No documents uploaded yet</p>';
                }
            }
            
            // Show success message
            const toast = new bootstrap.Toast(document.createElement('div'));
            const toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            toastContainer.innerHTML = `
                <div class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                    <div class="toast-header bg-success text-white">
                        <strong class="me-auto">Success</strong>
                        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                    </div>
                    <div class="toast-body">
                        Document deleted successfully.
                    </div>
                </div>
            `;
            document.body.appendChild(toastContainer);
            const toastEl = toastContainer.querySelector('.toast');
            const bsToast = new bootstrap.Toast(toastEl);
            bsToast.show();
            
            // Remove toast container after toast is hidden
            toastEl.addEventListener('hidden.bs.toast', function() {
                toastContainer.remove();
            });
        })
        .catch(error => {
            console.error('Error deleting document:', error);
            alert('Failed to delete document. Please try again.');
        });
    }
    
    // Helper function to find document name from ID
    function findDocumentName(docId) {
        let docName = 'document';
        
        // Try to find document name from document-link elements
        document.querySelectorAll('.document-link').forEach(link => {
            if (link.getAttribute('data-document-id') == docId) {
                docName = link.textContent.trim();
            }
        });
        
        // Try to find from document-item elements if not found
        if (docName === 'document') {
            document.querySelectorAll('.document-item').forEach(item => {
                if (item.getAttribute('data-document-id') == docId) {
                    const nameEl = item.querySelector('.text-truncate');
                    if (nameEl) {
                        docName = nameEl.textContent.trim().replace(/^\s*[\r\n]*/g, '');
                    }
                }
            });
        }
        
        return docName;
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
    
    // Escape HTML to prevent XSS
    function escapeHTML(string) {
        const element = document.createElement('div');
        element.textContent = string;
        return element.innerHTML;
    }
});
