import os
import logging
from flask import render_template, redirect, url_for, flash, request, jsonify, session, abort
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.exceptions import NotFound, Forbidden
from werkzeug.utils import secure_filename
from datetime import datetime

from app import db
from models import User, Document, ChatSession, ChatMessage
from forms import (
    LoginForm, SignupForm, ProfileForm, DocumentUploadForm, 
    ChatForm, ChatAPIForm, DocumentQuestionForm, DocumentQuestionAPIForm,
    DocumentAPIForm, ChatSessionAPIForm, RenameChatSessionForm
)
from ai_services import get_legal_response, summarize_legal_document, answer_document_question
from document_utils import save_document, extract_text_from_document, delete_document

logger = logging.getLogger(__name__)

def register_routes(app):
    @app.route('/')
    def index():
        """Home page route"""
        return render_template('index.html')

    @app.route('/login', methods=['GET', 'POST'])
    def login():
        """User login route"""
        # Redirect if user is already logged in
        if current_user.is_authenticated:
            return redirect(url_for('dashboard'))
            
        form = LoginForm()
        if form.validate_on_submit():
            user = User.query.filter_by(email=form.email.data).first()
            if user and user.check_password(form.password.data):
                login_user(user)
                next_page = request.args.get('next')
                flash('Login successful!', 'success')
                return redirect(next_page or url_for('dashboard'))
            else:
                flash('Invalid email or password', 'danger')
        
        return render_template('login.html', form=form)

    @app.route('/signup', methods=['GET', 'POST'])
    def signup():
        """User registration route"""
        # Redirect if user is already logged in
        if current_user.is_authenticated:
            return redirect(url_for('dashboard'))
            
        form = SignupForm()
        if form.validate_on_submit():
            user = User(
                username=form.username.data, 
                email=form.email.data
            )
            user.set_password(form.password.data)
            
            try:
                db.session.add(user)
                db.session.commit()
                
                # Log in the user
                login_user(user)
                flash('Account created successfully!', 'success')
                return redirect(url_for('dashboard'))
            except Exception as e:
                db.session.rollback()
                logger.error(f"Error creating user: {str(e)}")
                flash('An error occurred during registration. Please try again.', 'danger')
        
        return render_template('signup.html', form=form)

    @app.route('/logout')
    @login_required
    def logout():
        """User logout route"""
        logout_user()
        flash('You have been logged out', 'info')
        return redirect(url_for('index'))

    @app.route('/dashboard')
    @login_required
    def dashboard():
        """User dashboard route"""
        # Get the user's documents
        documents = Document.query.filter_by(user_id=current_user.id).order_by(Document.uploaded_at.desc()).all()
        
        # Get the user's chat sessions
        chat_sessions = ChatSession.query.filter_by(user_id=current_user.id).order_by(ChatSession.updated_at.desc()).all()
        
        # Forms
        chat_form = ChatForm()
        
        return render_template(
            'dashboard.html', 
            documents=documents, 
            chat_sessions=chat_sessions,
            chat_form=chat_form
        )

    @app.route('/profile', methods=['GET', 'POST'])
    @login_required
    def profile():
        """User profile route"""
        form = ProfileForm(obj=current_user)
        
        if form.validate_on_submit():
            # Check if username is being changed and is available
            if form.username.data != current_user.username:
                existing_user = User.query.filter_by(username=form.username.data).first()
                if existing_user:
                    flash('Username already exists', 'danger')
                    return render_template('profile.html', form=form)
            
            # Check if email is being changed and is available
            if form.email.data != current_user.email:
                existing_user = User.query.filter_by(email=form.email.data).first()
                if existing_user:
                    flash('Email already exists', 'danger')
                    return render_template('profile.html', form=form)
            
            # Update user profile
            current_user.username = form.username.data
            current_user.email = form.email.data
            
            # Update password if provided
            if form.current_password.data and form.new_password.data:
                if current_user.check_password(form.current_password.data):
                    current_user.set_password(form.new_password.data)
                    flash('Password updated successfully', 'success')
                else:
                    flash('Current password is incorrect', 'danger')
                    return render_template('profile.html', form=form)
            
            try:
                db.session.commit()
                flash('Profile updated successfully', 'success')
                return redirect(url_for('profile'))
            except Exception as e:
                db.session.rollback()
                logger.error(f"Error updating profile: {str(e)}")
                flash('An error occurred while updating your profile', 'danger')
        
        return render_template('profile.html', form=form)

    @app.route('/upload-document', methods=['GET', 'POST'])
    @login_required
    def upload_document():
        """Document upload route"""
        form = DocumentUploadForm()
        
        if form.validate_on_submit():
            try:
                file = form.document.data
                filename, original_filename, mime_type, size = save_document(file)
                
                # Extract text from the document
                text_content = extract_text_from_document(filename)
                
                # Create document record
                document = Document(
                    filename=filename,
                    original_filename=original_filename,
                    content=text_content,
                    mime_type=mime_type,
                    size=size,
                    user_id=current_user.id
                )
                
                db.session.add(document)
                db.session.commit()
                
                logger.info(f"Document uploaded successfully: ID={document.id}, Name={original_filename}")
                
                # Automatically create a summary for the document
                try:
                    summary = ai_services.summarize_legal_document(text_content)
                    document.summary = summary
                    db.session.commit()
                    logger.info(f"Document summary generated for ID={document.id}")
                except Exception as e:
                    logger.error(f"Error generating summary: {str(e)}")
                    # Continue even if summary generation fails
                
                flash('Document uploaded successfully', 'success')
                return redirect(url_for('document_detail', document_id=document.id))
                
            except Exception as e:
                db.session.rollback()
                logger.error(f"Error uploading document: {str(e)}")
                flash(f'Error uploading document: {str(e)}', 'danger')
        
        # Create chat form for the template
        chat_form = ChatForm()
        return render_template('dashboard.html', form=form, chat_form=chat_form)

    @app.route('/document/<int:document_id>')
    @login_required
    def document_detail(document_id):
        """Document detail route"""
        document = Document.query.get_or_404(document_id)
        
        # Check if user has access to this document
        if document.user_id != current_user.id:
            abort(403)  # Forbidden
        
        # Auto-generate summary if not already available
        if not document.summary:
            try:
                logger.info(f"Auto-generating summary for document ID={document.id}")
                summary = summarize_legal_document(document.content)
                document.summary = summary
                db.session.commit()
                logger.info(f"Summary generated for document ID={document.id}")
            except Exception as e:
                logger.error(f"Error auto-generating summary: {str(e)}")
                # Continue even if summary generation fails
        
        # Get all user documents for sidebar
        documents = Document.query.filter_by(user_id=current_user.id).order_by(Document.uploaded_at.desc()).all()
        
        # Form for asking questions about the document
        question_form = DocumentQuestionForm()
        
        # Create chat form for the template
        chat_form = ChatForm()
        
        # Get chat sessions for sidebar
        chat_sessions = ChatSession.query.filter_by(user_id=current_user.id).order_by(ChatSession.updated_at.desc()).all()
        
        return render_template('dashboard.html', 
                             active_document=document,
                             documents=documents,
                             chat_sessions=chat_sessions,
                             question_form=question_form,
                             chat_form=chat_form)

    @app.route('/document/<int:document_id>/summarize', methods=['POST'])
    @login_required
    def summarize_document(document_id):
        """Generate a summary of the document"""
        document = Document.query.get_or_404(document_id)
        
        # Check if user has access to this document
        if document.user_id != current_user.id:
            return jsonify({'error': 'Unauthorized access'}), 403
        
        # Log form data for debugging
        logger.info(f"Summarize document form data: {request.form}")
        
        # Use DocumentAPIForm which has CSRF disabled for API endpoints
        form = DocumentAPIForm(request.form)
        if form.validate():
            try:
                # Check if summary already exists
                if document.summary:
                    return jsonify({'summary': document.summary})
                
                # Generate summary
                summary = summarize_legal_document(document.content)
                
                # Save the summary
                document.summary = summary
                db.session.commit()
                
                return jsonify({'summary': summary})
            except Exception as e:
                logger.error(f"Error summarizing document: {str(e)}")
                return jsonify({'error': str(e)}), 500
        else:
            logger.error(f"Form validation error: {form.errors}")
            return jsonify({'error': 'Invalid form data'}), 400

    @app.route('/document/<int:document_id>/ask', methods=['POST'])
    @login_required
    def ask_document_question(document_id):
        """Ask a question about a specific document"""
        document = Document.query.get_or_404(document_id)
        
        # Check if user has access to this document
        if document.user_id != current_user.id:
            return jsonify({'error': 'Unauthorized access'}), 403
        
        # Log form data for debugging
        logger.info(f"Document question form data: {request.form}")
        
        # Use DocumentQuestionAPIForm which has CSRF disabled for API endpoints
        form = DocumentQuestionAPIForm(request.form)
        if form.validate():
            try:
                question = form.question.data
                
                # Get answer from AI service
                answer = answer_document_question(question, document.content)
                
                # Create or get chat session
                session_id = request.form.get('session_id')
                if session_id:
                    chat_session = ChatSession.query.get(session_id)
                    if not chat_session or chat_session.user_id != current_user.id:
                        # Invalid session, create a new one
                        chat_session = ChatSession(
                            title=f"Document Q&A: {document.original_filename}",
                            user_id=current_user.id
                        )
                        db.session.add(chat_session)
                        db.session.flush()  # Get the ID without committing
                else:
                    # Create new session
                    chat_session = ChatSession(
                        title=f"Document Q&A: {document.original_filename}",
                        user_id=current_user.id
                    )
                    db.session.add(chat_session)
                    db.session.flush()  # Get the ID without committing
                
                # Save user question
                user_message = ChatMessage(
                    content=question,
                    is_user=True,
                    session_id=chat_session.id,
                    document_id=document.id
                )
                db.session.add(user_message)
                
                # Save AI response
                ai_message = ChatMessage(
                    content=answer,
                    is_user=False,
                    session_id=chat_session.id,
                    document_id=document.id
                )
                db.session.add(ai_message)
                
                # Update session time
                chat_session.updated_at = datetime.utcnow()
                
                db.session.commit()
                
                return jsonify({
                    'answer': answer,
                    'session_id': chat_session.id
                })
                
            except Exception as e:
                db.session.rollback()
                logger.error(f"Error processing document question: {str(e)}")
                return jsonify({'error': str(e)}), 500
        else:
            return jsonify({'error': 'Invalid form data'}), 400

    @app.route('/chat/new', methods=['POST'])
    @login_required
    def new_chat():
        """Start a new chat session"""
        try:
            # Log request info for debugging
            logger.info(f"New chat request from user {current_user.id}. Form data: {request.form}")
            
            # Create new chat session
            chat_session = ChatSession(
                title=f"New Legal Chat {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
                user_id=current_user.id
            )
            db.session.add(chat_session)
            db.session.commit()
            
            logger.info(f"Created new chat session with ID {chat_session.id} for user {current_user.id}")
            
            return jsonify({
                'session_id': chat_session.id,
                'title': chat_session.title
            })
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating chat session: {str(e)}")
            return jsonify({'error': str(e)}), 500

    @app.route('/chat/<int:session_id>', methods=['GET'])
    @login_required
    def get_chat_session(session_id):
        """Get chat session messages"""
        chat_session = ChatSession.query.get_or_404(session_id)
        
        # Check if user has access to this chat session
        if chat_session.user_id != current_user.id:
            return jsonify({'error': 'Unauthorized access'}), 403
        
        messages = ChatMessage.query.filter_by(session_id=session_id).order_by(ChatMessage.timestamp).all()
        
        chat_messages = []
        for message in messages:
            chat_messages.append({
                'id': message.id,
                'content': message.content,
                'is_user': message.is_user,
                'timestamp': message.timestamp.isoformat(),
                'document_id': message.document_id
            })
        
        return jsonify({
            'session_id': chat_session.id,
            'title': chat_session.title,
            'messages': chat_messages
        })

    @app.route('/chat/<int:session_id>/send', methods=['POST'])
    @login_required
    def send_chat_message(session_id):
        """Send a message in a chat session"""
        chat_session = ChatSession.query.get_or_404(session_id)
        
        # Check if user has access to this chat session
        if chat_session.user_id != current_user.id:
            return jsonify({'error': 'Unauthorized access'}), 403
        
        # Log form data for debugging
        logger.info(f"Chat message form data: {request.form}")
        
        # Use ChatAPIForm which has CSRF disabled for API endpoints
        form = ChatAPIForm(request.form)
        if form.validate():
            try:
                user_message = form.message.data
                
                # Save user message
                chat_message = ChatMessage(
                    content=user_message,
                    is_user=True,
                    session_id=session_id
                )
                db.session.add(chat_message)
                
                # Get response from AI
                ai_response = get_legal_response(user_message)
                
                # Save AI response
                ai_message = ChatMessage(
                    content=ai_response,
                    is_user=False,
                    session_id=session_id
                )
                db.session.add(ai_message)
                
                # Update session time
                chat_session.updated_at = datetime.utcnow()
                
                db.session.commit()
                
                return jsonify({
                    'user_message_id': chat_message.id,
                    'ai_message_id': ai_message.id,
                    'ai_response': ai_response
                })
                
            except Exception as e:
                db.session.rollback()
                logger.error(f"Error sending chat message: {str(e)}")
                return jsonify({'error': str(e)}), 500
        else:
            return jsonify({'error': 'Invalid message data'}), 400

    @app.route('/chat/<int:session_id>/rename', methods=['POST'])
    @login_required
    def rename_chat_session(session_id):
        """Rename a chat session"""
        chat_session = ChatSession.query.get_or_404(session_id)
        
        # Check if user has access to this chat session
        if chat_session.user_id != current_user.id:
            return jsonify({'error': 'Unauthorized access'}), 403
        
        # Log request data for debugging
        logger.info(f"Rename chat session data - Form: {request.form}, JSON: {request.json}")
        
        # For JSON requests
        if request.is_json:
            title = request.json.get('title')
            if not title:
                return jsonify({'error': 'Title cannot be empty'}), 400
            
            try:
                chat_session.title = title
                db.session.commit()
                return jsonify({'success': True, 'title': title})
            except Exception as e:
                db.session.rollback()
                logger.error(f"Error renaming chat session: {str(e)}")
                return jsonify({'error': str(e)}), 500
        # For form data requests
        else:
            form = RenameChatSessionForm(request.form)
            if form.validate():
                try:
                    chat_session.title = form.title.data
                    db.session.commit()
                    return jsonify({'success': True, 'title': form.title.data})
                except Exception as e:
                    db.session.rollback()
                    logger.error(f"Error renaming chat session: {str(e)}")
                    return jsonify({'error': str(e)}), 500
            else:
                logger.error(f"Form validation error: {form.errors}")
                return jsonify({'error': 'Invalid form data'}), 400

    @app.route('/document/<int:document_id>/delete', methods=['POST'])
    @login_required
    def delete_document_route(document_id):
        """Delete a document"""
        document = Document.query.get_or_404(document_id)
        
        # Check if user has access to this document
        if document.user_id != current_user.id:
            return jsonify({'error': 'Unauthorized access'}), 403
        
        # Log form data for debugging
        logger.info(f"Delete document form data: {request.form}")
        
        # Use DocumentAPIForm which has CSRF disabled for API endpoints
        form = DocumentAPIForm(request.form)
        if form.validate():
            try:
                # Delete the file
                delete_document(document.filename)
                
                # Delete the database record
                db.session.delete(document)
                db.session.commit()
                
                return jsonify({'success': True})
            except Exception as e:
                db.session.rollback()
                logger.error(f"Error deleting document: {str(e)}")
                return jsonify({'error': str(e)}), 500
        else:
            logger.error(f"Form validation error: {form.errors}")
            return jsonify({'error': 'Invalid form data'}), 400

    @app.route('/chat/<int:session_id>/delete', methods=['POST'])
    @login_required
    def delete_chat_session(session_id):
        """Delete a chat session"""
        chat_session = ChatSession.query.get_or_404(session_id)
        
        # Check if user has access to this chat session
        if chat_session.user_id != current_user.id:
            return jsonify({'error': 'Unauthorized access'}), 403
        
        # Log form data for debugging
        logger.info(f"Delete chat session form data: {request.form}")
        
        # Use ChatSessionAPIForm which has CSRF disabled for API endpoints
        form = ChatSessionAPIForm(request.form)
        if form.validate():
            try:
                # Delete all messages
                ChatMessage.query.filter_by(session_id=session_id).delete()
                
                # Delete the session
                db.session.delete(chat_session)
                db.session.commit()
                
                return jsonify({'success': True})
            except Exception as e:
                db.session.rollback()
                logger.error(f"Error deleting chat session: {str(e)}")
                return jsonify({'error': str(e)}), 500
        else:
            logger.error(f"Form validation error: {form.errors}")
            return jsonify({'error': 'Invalid form data'}), 400

    # Error handlers
    @app.errorhandler(404)
    def page_not_found(e):
        return render_template('404.html'), 404

    @app.errorhandler(403)
    def forbidden(e):
        return render_template('403.html'), 403

    @app.errorhandler(500)
    def server_error(e):
        return render_template('500.html'), 500

    # Create uploads directory if it doesn't exist
    os.makedirs('uploads', exist_ok=True)
