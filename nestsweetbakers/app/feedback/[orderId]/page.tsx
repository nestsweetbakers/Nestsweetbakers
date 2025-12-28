import FeedbackForm from '@/components/FeedbackForm';

export default async function FeedbackPage({ 
  params 
}: { 
  params: Promise<{ orderId: string }> 
}) {
  // Await params (required in Next.js 15+)
  const { orderId } = await params;
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">Share Your Experience</h1>
      <p className="text-gray-600 mb-8">
        Thank you for ordering from us! Your feedback helps us serve you better.
      </p>
      <FeedbackForm orderId={orderId} />
    </div>
  );
}
