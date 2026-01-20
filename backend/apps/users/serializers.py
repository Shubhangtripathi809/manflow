from django.contrib.auth import get_user_model
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model with structured skills.
    """
    # Explicitly defining this isn't strictly necessary for JSONField, 
    # but it helps with Swagger/API docs if you use them.
    skills = serializers.JSONField(required=False)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "role", "avatar", "skills", "is_active", "date_joined",
        ]
        read_only_fields = ["id", "date_joined"]

    def validate_skills(self, value):
        """
        Validates that skills is a list of dictionaries with specific keys:
        - name (str)
        - proficiency (str, choice)
        - category (str, choice)
        """
        if not isinstance(value, list):
            raise serializers.ValidationError("Skills must be a list of skill objects.")

        # Get valid choices from the Model
        valid_proficiencies = User.SkillProficiency.values
        valid_categories = User.SkillCategory.values

        validated_skills = []

        for index, item in enumerate(value):
            if not isinstance(item, dict):
                raise serializers.ValidationError(f"Item at index {index} must be a dictionary/object.")

            # 1. Validate Skill Name
            name = item.get("name")
            if not name or not isinstance(name, str):
                raise serializers.ValidationError(f"Item at index {index} is missing a valid 'name'.")
            
            # 2. Validate Proficiency
            proficiency = item.get("proficiency")
            if proficiency not in valid_proficiencies:
                raise serializers.ValidationError(
                    f"Invalid proficiency '{proficiency}' for skill '{name}'. "
                    f"Allowed: {', '.join(valid_proficiencies)}"
                )

            # 3. Validate Category
            category = item.get("category")
            if category not in valid_categories:
                # Optional: You can default to 'Other' if missing, 
                # or raise an error. Here we raise an error for strictness.
                raise serializers.ValidationError(
                    f"Invalid category '{category}' for skill '{name}'. "
                    f"Allowed: {', '.join(valid_categories)}"
                )

            # Clean and append (Title Case for consistency)
            validated_skills.append({
                "name": name.strip().title(),
                "proficiency": proficiency,
                "category": category
            })

        return validated_skills



class UserCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating users.
    """
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            "username", "email", "password", "password_confirm",
            "first_name", "last_name", "role",
        ]
    
    def validate(self, data):
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match"})
        return data
    
    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

class UserRoleUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['role']
        
    def validate_role(self, value):
        if value not in User.Role.values:
             raise serializers.ValidationError("Invalid role selected.")
        return value
    
class UserMinimalSerializer(serializers.ModelSerializer):
    """
    Minimal serializer for user references.
    """
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ["id", "username", "full_name", "avatar"]
    
    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username
    
class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=4)

class SetNewPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    reset_token = serializers.CharField() # Use reset_token instead of otp
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)

    def validate(self, data):
        # Match passwords
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return data

class AuthenticatedResetPasswordSerializer(serializers.Serializer):
    username = serializers.CharField()
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    confirm_new_password = serializers.CharField(write_only=True)

    def validate(self, data):
        # 1. Ensure new password and confirm password match
        if data["new_password"] != data["confirm_new_password"]:
            raise serializers.ValidationError({"confirm_new_password": "New passwords do not match."})
        
        # 2. Ensure new password is not the same as the old password
        if data["new_password"] == data["old_password"]:
            raise serializers.ValidationError({"new_password": "New password cannot be the same as the old password."})
            
        return data