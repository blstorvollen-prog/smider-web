import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const orgNr = searchParams.get('orgNr');

    if (!orgNr) {
        return NextResponse.json({ error: 'Missing orgNr parameter' }, { status: 400 });
    }

    try {
        const response = await fetch(`https://data.brreg.no/enhetsregisteret/api/enheter/${orgNr}`);

        if (response.status === 404) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        if (!response.ok) {
            throw new Error(`Brønnøysundregistrene API responded with status: ${response.status}`);
        }

        const data = await response.json();

        // Map the response to a simpler format
        // We want name and address primarily
        const result = {
            navn: data.navn,
            forretningsadresse: data.forretningsadresse,
        };

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error fetching data from Brønnøysundregistrene:', error);
        return NextResponse.json({ error: 'Failed to fetch organization data' }, { status: 500 });
    }
}
