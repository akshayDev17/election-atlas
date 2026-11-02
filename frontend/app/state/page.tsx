import type { Metadata } from 'next';
import StateView from '@/components/StateView';
import './state.css';

export const metadata: Metadata = {
  title: 'State — Election Atlas of India',
  description: "One state under two grids: its legislative assembly seats and its Lok Sabha seats, with each constituency's own result on hover.",
};

export default function Page() {
  return <StateView />;
}
