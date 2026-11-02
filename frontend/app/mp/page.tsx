import type { Metadata } from 'next';
import MpView from '@/components/MpView';
import './mp.css';

export const metadata: Metadata = {
  title: 'Member of Parliament — Election Atlas of India',
  description: 'One member of Parliament: their development fund, their attendance, their questions, and the assembly seats under their constituency.',
};

export default function Page() {
  return <MpView />;
}
