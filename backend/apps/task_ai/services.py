import boto3
import requests
import json
from django.conf import settings
from datetime import date
import io
import PyPDF2

class TaskAIService:
    @staticmethod
    def get_project_context_from_s3(project):
        s3 = boto3.client('s3')
        bucket_name = settings.AWS_STORAGE_BUCKET_NAME
        prefix = f"projects/{project.id}/documents/"
        context_text = f"Project Name: {project.name}\n"
        
        try:
            response = s3.list_objects_v2(Bucket=bucket_name, Prefix=prefix)
            if 'Contents' not in response:
                return context_text

            for obj in response['Contents']:
                file_key = obj['Key']
                file_obj = s3.get_object(Bucket=bucket_name, Key=file_key)
                file_content = file_obj['Body'].read()

                # Handle PDF files specifically
                if file_key.lower().endswith('.pdf'):
                    pdf_file = io.BytesIO(file_content)
                    reader = PyPDF2.PdfReader(pdf_file)
                    for page in reader.pages:
                        context_text += page.extract_text() + "\n"
                
                # Handle standard text files
                elif file_key.lower().endswith('.txt'):
                    context_text += file_content.decode('utf-8') + "\n"

        except Exception as e:
            print(f"Error processing S3 file: {e}")
            
        return context_text[:4000]

    @staticmethod
    def generate_task_data(project_context, user_description):
        """
        Calls the local Llama 8B model with a strict flat schema.
        """
        prompt = f"""
        You are a professional project manager. 
        Analyze the Project Context and Task Intent provided below.
        
        Project Context: {project_context}
        User Task Intent: {user_description}
        Today's Date: {date.today().isoformat()}

        Return ONLY a FLAT JSON object. 
        Do NOT use nested arrays, steps, or substeps. 
        The "description" field must be a single string containing a detailed paragraph or a simple bulleted list in plain text.

        Schema Required:
        {{
            "heading": "String (Short Title)",
            "description": "String (Detailed plain text explanation)",
            "end_date": "YYYY-MM-DD",
            "priority": "low | medium | high | critical"
        }}
        """

        # Replace with your local Llama endpoint (e.g., Ollama)
        local_llm_url = "http://localhost:11434/api/generate" 
        payload = {
            "model": "llama3:8b", # or your specific model tag
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }

        try:
            response = requests.post(local_llm_url, json=payload)
            return response.json().get('response')
        except Exception as e:
            return None