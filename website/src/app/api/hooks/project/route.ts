export async function POST(request: Request) {
	const data = await request.json();

	const response = await fetch(process.env.HOOK_API as string, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			level: "info",
			title: "Project",
			message: data.content,
		}),
	});

	return new Response(null, { status: response.status });
}
