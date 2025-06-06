import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # SQLALCHEMY_DATABASE_URI = "postgresql://ztn:ztn%40sim@localhost:5432/ztn_db" #for normal localhost
    #SQLALCHEMY_DATABASE_URI = "postgresql://ztn:ztn%40sim@db:5432/ztn_db" #for docker
    SQLALCHEMY_DATABASE_URI = "postgresql://ztn:ztn%40sim@10.88.0.2:5432/ztn_db" #for podman
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    JWT_ACCESS_COOKIE_NAME= 'access_token_cookie'
    JWT_TOKEN_LOCATION = ['cookies']
    JWT_ACCESS_COOKIE_PATH = '/'
    JWT_REFRESH_COOKIE_PATH = '/api/auth/refresh'
    JWT_COOKIE_SECURE = False  
    JWT_COOKIE_CSRF_PROTECT = False 
    JWT_CSRF_IN_COOKIES = False  

    JWT_REFRESH_TOKEN_EXPIRES = 30 * 60  # 30 minutes
    JWT_COOKIE_SAMESITE = "Lax"  # or "Strict", but Lax is ideal for login flows


    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "fallback-in-dev")

    # Flask-Mail Settings
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')    # The app password you generated
    MAIL_DEFAULT_SENDER = 'bztniplab@gmail.com'  
    ADMIN_ALERT_EMAIL = 'patrick.mutabazi.pj1@g.ext.naist.jp'  # The email that receives alerts

