from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, EmailField, TextAreaField, FileField, SubmitField
from wtforms.validators import DataRequired, Email, EqualTo, Length, ValidationError
from models import User


class LoginForm(FlaskForm):
    email = EmailField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired()])
    submit = SubmitField('Log In')


class SignupForm(FlaskForm):
    username = StringField('Username', validators=[
        DataRequired(), 
        Length(min=3, max=64, message='Username must be between 3 and 64 characters')
    ])
    email = EmailField('Email', validators=[
        DataRequired(),
        Email(message='Please enter a valid email address')
    ])
    password = PasswordField('Password', validators=[
        DataRequired(),
        Length(min=8, message='Password must be at least 8 characters long')
    ])
    confirm_password = PasswordField('Confirm Password', validators=[
        DataRequired(),
        EqualTo('password', message='Passwords must match')
    ])
    submit = SubmitField('Sign Up')
    
    def validate_username(self, username):
        user = User.query.filter_by(username=username.data).first()
        if user:
            raise ValidationError('Username already exists. Please choose a different one.')
    
    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user:
            raise ValidationError('Email already registered. Please use a different one or log in.')


class ProfileForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    email = EmailField('Email', validators=[DataRequired(), Email()])
    current_password = PasswordField('Current Password')
    new_password = PasswordField('New Password')
    confirm_new_password = PasswordField('Confirm New Password', validators=[
        EqualTo('new_password', message='Passwords must match')
    ])
    submit = SubmitField('Update Profile')


class DocumentUploadForm(FlaskForm):
    document = FileField('Upload Document', validators=[DataRequired()])
    submit = SubmitField('Upload')


class ChatForm(FlaskForm):
    message = TextAreaField('Your Question', validators=[DataRequired()])
    submit = SubmitField('Send')


class ChatAPIForm(FlaskForm):
    message = TextAreaField('Your Question', validators=[DataRequired()])
    
    class Meta:
        # Disable CSRF for API endpoints
        csrf = False


class DocumentQuestionForm(FlaskForm):
    question = TextAreaField('Your Question About This Document', validators=[DataRequired()])
    submit = SubmitField('Ask')
    
    
class DocumentQuestionAPIForm(FlaskForm):
    question = TextAreaField('Your Question About This Document', validators=[DataRequired()])
    
    class Meta:
        # Disable CSRF for API endpoints
        csrf = False


class DocumentAPIForm(FlaskForm):
    """Base form for document API endpoints that don't require specific fields"""
    class Meta:
        # Disable CSRF for API endpoints
        csrf = False


class ChatSessionAPIForm(FlaskForm):
    """Base form for chat session API endpoints that don't require specific fields"""
    class Meta:
        # Disable CSRF for API endpoints
        csrf = False
        
        
class RenameChatSessionForm(FlaskForm):
    """Form for renaming a chat session"""
    title = StringField('Title', validators=[DataRequired()])
    
    class Meta:
        # Disable CSRF for API endpoints
        csrf = False
