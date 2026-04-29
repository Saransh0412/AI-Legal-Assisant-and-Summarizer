import os
import logging
import requests
import json

# Get the API key
TOGETHER_API_KEY = os.environ.get("TOGETHER_API_KEY")
if not TOGETHER_API_KEY:
    logging.warning("TOGETHER_API_KEY environment variable not set")

# Together API base URL and model
TOGETHER_API_URL = "https://api.together.xyz/v1/chat/completions"
MODEL = "mistralai/Mixtral-8x7B-Instruct-v0.1"  # A good general purpose model

def get_legal_response(question, context=None):
    """
    Get a response to a legal question from Together.ai.
    
    Args:
        question (str): The legal question to ask
        context (str, optional): Additional context such as document content
        
    Returns:
        str: The AI response
    """
    try:
        # Prepare system message with legal context
        system_message = """
        You are LexAssist, an AI legal assistant designed to provide information and guidance on legal matters.
        While you can provide legal information, make sure to clearly state that you are not providing legal advice
        and that users should consult with qualified legal professionals for their specific situations.
        
        Provide factual, balanced, and professionally-toned responses about laws, regulations, legal procedures,
        and legal concepts. Cite relevant laws, cases, or statutes when possible.
        
        When uncertain, acknowledge limitations and suggest resources for further research.
        """
        
        messages = [
            {"role": "system", "content": system_message},
        ]
        
        # Add context if provided
        if context:
            messages.append({
                "role": "system", 
                "content": f"The user has provided this document text as context for their question: {context}"
            })
        
        messages.append({"role": "user", "content": question})
        
        # API request to Together.ai
        headers = {
            "Authorization": f"Bearer {TOGETHER_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": MODEL,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 1000
        }
        
        response = requests.post(TOGETHER_API_URL, headers=headers, json=payload)
        response.raise_for_status()  # Raise exception for HTTP errors
        
        response_data = response.json()
        return response_data["choices"][0]["message"]["content"]
    
    except Exception as e:
        logging.error(f"Error getting legal response: {str(e)}")
        return f"I apologize, but I encountered an error while processing your question. Please try again later. Error details: {str(e)}"

def summarize_legal_document(document_text):
    """
    Summarize a legal document using Together.ai.
    
    Args:
        document_text (str): The text content of the document
        
    Returns:
        str: A summary of the document
    """
    try:
        prompt = """
        Please provide a clear and concise summary of the following legal document. 
        Include the main purpose, key provisions, obligations, rights, and any important dates or deadlines.
        Structure the summary in sections with bullet points for clarity.
        """
        
        # Limit the document size to prevent token overflow
        max_chars = 15000  # Rough estimate to stay within token limits
        truncated_text = document_text[:max_chars] if len(document_text) > max_chars else document_text
        
        if len(document_text) > max_chars:
            truncated_text += "\n\n[Document truncated due to length...]"
        
        # API request to Together.ai
        headers = {
            "Authorization": f"Bearer {TOGETHER_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": MODEL,
            "messages": [
                {"role": "system", "content": prompt},
                {"role": "user", "content": truncated_text}
            ],
            "temperature": 0.5,
            "max_tokens": 800
        }
        
        response = requests.post(TOGETHER_API_URL, headers=headers, json=payload)
        response.raise_for_status()  # Raise exception for HTTP errors
        
        response_data = response.json()
        return response_data["choices"][0]["message"]["content"]
        
    except Exception as e:
        logging.error(f"Error summarizing document: {str(e)}")
        return f"I apologize, but I encountered an error while summarizing the document. Please try again later. Error details: {str(e)}"

def answer_document_question(question, document_text):
    """
    Answer a question about a specific document.
    
    Args:
        question (str): The question about the document
        document_text (str): The text content of the document
        
    Returns:
        str: The answer to the question based on the document
    """
    try:
        # Limit the document size to prevent token overflow
        max_chars = 15000  # Rough estimate to stay within token limits
        truncated_text = document_text[:max_chars] if len(document_text) > max_chars else document_text
        
        if len(document_text) > max_chars:
            truncated_text += "\n\n[Document truncated due to length...]"
        
        # API request to Together.ai
        headers = {
            "Authorization": f"Bearer {TOGETHER_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": MODEL,
            "messages": [
                {"role": "system", "content": "You are a legal assistant that helps answer questions about legal documents. Answer based solely on the information in the provided document. If the information isn't in the document, clearly state that."},
                {"role": "user", "content": f"Document content: {truncated_text}\n\nQuestion: {question}"}
            ],
            "temperature": 0.3,
            "max_tokens": 600
        }
        
        response = requests.post(TOGETHER_API_URL, headers=headers, json=payload)
        response.raise_for_status()  # Raise exception for HTTP errors
        
        response_data = response.json()
        return response_data["choices"][0]["message"]["content"]
        
    except Exception as e:
        logging.error(f"Error answering document question: {str(e)}")
        return f"I apologize, but I encountered an error while answering your question about the document. Please try again later. Error details: {str(e)}"
