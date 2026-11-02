import type { Metadata } from 'next';
import MlaView from '@/components/MlaView';
import './mla.css';

export const metadata: Metadata = {
  title: 'Member of Legislative Assembly — Election Atlas of India',
  description: 'One member of a state legislative assembly: their seat, their result, and (soon) their development fund and assembly record.',
};

export default function Page() {
  return <MlaView />;
}
