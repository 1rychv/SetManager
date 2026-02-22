export default async function ApplyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1>Open Mic Application</h1>
      <p className="text-muted-foreground mt-2">
        Apply to perform at: {slug}
      </p>
    </div>
  );
}
