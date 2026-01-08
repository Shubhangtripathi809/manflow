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
    def get_project_members_with_skills(project):
        """
        Get all project members (excluding admins) with their skills metadata.
        Returns a list of dicts with user info and skills.
        """
        members_data = []
        
        # Get all members from the project
        for member in project.members.all():
            # Skip admin users - they should never be assigned tasks
            if member.role == 'admin':
                continue
                
            member_info = {
                'id': member.id,
                'username': member.username,
                'email': member.email,
                'role': member.role,
                'skills': []
            }
            
            # Get skills for this member
            if hasattr(member, 'skills') and member.skills:
                if isinstance(member.skills, str):
                    # If skills is stored as JSON string
                    try:
                        member_info['skills'] = json.loads(member.skills)
                    except json.JSONDecodeError:
                        member_info['skills'] = []
                elif isinstance(member.skills, list):
                    # If skills is already a list (JSONField)
                    member_info['skills'] = member.skills
                else:
                    # If skills is a queryset (related model)
                    member_info['skills'] = [
                        {
                            'name': skill.name,
                            'proficiency': skill.proficiency,
                            'category': skill.category
                        } for skill in member.skills.all()
                    ]
            
            members_data.append(member_info)
        
        return members_data

    @staticmethod
    def generate_task_data_with_assignment(project_context, user_description, members_with_skills):
        """
        Calls the local Llama 8B model with project context and member skills
        to generate task data with intelligent assignment.
        """
        # Format members data for the AI prompt
        members_summary = []
        for member in members_with_skills:
            skills_text = ", ".join([
                f"{s['name']} ({s['proficiency']}, {s['category']})" 
                for s in member['skills']
            ])
            members_summary.append(
                f"- {member['username']} (Role: {member['role']}, ID: {member['id']}): {skills_text}"
            )
        
        members_text = "\n".join(members_summary)
        
        prompt = f"""
You are a professional project manager with expertise in task assignment.
Analyze the Project Context, Task Intent, and Team Members' skills provided below.

Project Context: {project_context}
User Task Intent: {user_description}
Today's Date: {date.today().isoformat()}

Available Team Members (NEVER assign to admin):
{members_text}

ASSIGNMENT RULES (CRITICAL):
1. Analyze the task description to identify required skills (frontend, backend, management, etc.)
2. Match team members based on their skills and proficiency levels
3. Priority order: Regular users FIRST, then managers
4. NEVER assign tasks to admin role members
5. Assign to 1-3 members maximum who best match the required skills
6. Consider proficiency levels: Expert > Advanced > Intermediate > Beginner

Return ONLY a FLAT JSON object with this exact schema:

{{
    "heading": "String (Short, descriptive task title)",
    "description": "String (Detailed plain text explanation of the task)",
    "end_date": "YYYY-MM-DD (realistic completion date based on task complexity)",
    "priority": "low | medium | high | critical",
    "assigned_to": [list of user IDs who match the skills needed],
    "required_skills": ["skill1", "skill2"],
    "assignment_reasoning": "Brief explanation of why these members were chosen"
}}

Example for a React frontend task:
{{
    "heading": "Build User Dashboard Component",
    "description": "Create a responsive user dashboard using React with real-time data updates...",
    "end_date": "2025-01-15",
    "priority": "high",
    "assigned_to": [5, 8],
    "required_skills": ["React", "JavaScript", "CSS"],
    "assignment_reasoning": "Selected members with React expertise (Intermediate+)"
}}
"""

        # Replace with your local Llama endpoint (e.g., Ollama)
        local_llm_url = "http://localhost:11434/api/generate" 
        payload = {
            "model": "llama3:8b",
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }

        try:
            response = requests.post(local_llm_url, json=payload, timeout=30)
            response.raise_for_status()
            return response.json().get('response')
        except Exception as e:
            print(f"Error calling AI service: {e}")
            return None

    @staticmethod
    def fallback_assignment(members_with_skills, task_category='general'):
        """
        Fallback logic if AI assignment fails.
        Prioritizes users over managers, excludes admins.
        """
        # Separate users and managers
        users = [m for m in members_with_skills if m['role'] == 'user']
        managers = [m for m in members_with_skills if m['role'] == 'manager']
        
        # Try to find matching skills
        matching_members = []
        
        if task_category in ['frontend', 'backend']:
            for member in users + managers:
                has_skill = any(
                    skill['category'].lower() == task_category.lower()
                    for skill in member['skills']
                )
                if has_skill:
                    matching_members.append(member['id'])
                    if len(matching_members) >= 2:
                        break
        
        # If no skill match or general task, assign first available user, then manager
        if not matching_members:
            if users:
                matching_members.append(users[0]['id'])
            elif managers:
                matching_members.append(managers[0]['id'])
        
        return matching_members if matching_members else []