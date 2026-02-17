import { apiService } from './api.service';
import { authService } from './auth.service';
import env from '../config/env';

const API_BASE_URL = env.apiUrl;

export interface FeedbackSummary {
  id: string;
  category: string;
  subject: string;
  status: string;
  platform: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
}

export interface FeedbackImage {
  id: string;
  imageUrl: string;
  fileName: string;
}

export interface FeedbackMessage {
  id: string;
  message: string;
  senderType: 'USER' | 'OWNER' | 'ADMIN';
  senderName: string | null;
  createdAt: string;
  images: FeedbackImage[];
}

export interface FeedbackDetail {
  id: string;
  category: string;
  subject: string;
  status: string;
  messages: FeedbackMessage[];
}

export interface CreateFeedbackData {
  category: string;
  subject: string;
  message: string;
  platform: string;
  contactEmail?: string;
  contactPhone?: string;
}

export const feedbackService = {
  async createFeedback(data: CreateFeedbackData) {
    return apiService.post('/api/feedback', data);
  },

  async getMyFeedbacks() {
    return apiService.get('/api/feedback');
  },

  async getFeedbackDetail(id: string) {
    return apiService.get(`/api/feedback/${id}`);
  },

  async sendMessage(feedbackId: string, message: string) {
    return apiService.post(`/api/feedback/${feedbackId}/messages`, { message });
  },

  async uploadImage(feedbackId: string, messageId: string, imageUri: string, fileName: string) {
    const token = await authService.getStoredAccessToken();

    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: fileName || 'photo.jpg',
    } as any);
    formData.append('messageId', messageId);

    const response = await fetch(`${API_BASE_URL}/api/feedback/${feedbackId}/images`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    const data = await response.json();
    return { data, error: response.ok ? null : data.error, status: response.status };
  },
};
