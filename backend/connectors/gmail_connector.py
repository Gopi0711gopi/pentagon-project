from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

class GmailConnector:
    def __init__(self):
        self.service = None
    
    def send_email(self, to, subject, body):
        pass

gmail_connector = GmailConnector()