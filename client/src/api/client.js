import axios from 'axios';

export const api = axios.create({});

export function errorMessage(err) {
  return err.response?.data?.error || err.message || 'Something went wrong';
}
