import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import type { PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';
import { z } from 'zod';

const signInSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1)
});

const signUpSchema = z.object({
	email: z.string().email(),
	password: z.string().min(6),
	name: z.string().min(1)
});

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		return redirect(302, '/demo/better-auth');
	}
	return {};
};

export const actions: Actions = {
	signInEmail: async (event) => {
		const formData = await event.request.formData();
		const raw = {
			email: formData.get('email')?.toString() ?? '',
			password: formData.get('password')?.toString() ?? ''
		};

		const parsed = signInSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0].message });
		}

		const { email, password } = parsed.data;

		try {
			await auth.api.signInEmail({
				body: {
					email,
					password
				}
			});
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { message: error.message || 'Signin failed' });
			}
			return fail(500, { message: 'Unexpected error' });
		}

		return redirect(302, '/demo/better-auth');
	},
	signUpEmail: async (event) => {
		const formData = await event.request.formData();
		const raw = {
			email: formData.get('email')?.toString() ?? '',
			password: formData.get('password')?.toString() ?? '',
			name: formData.get('name')?.toString() ?? ''
		};

		const parsed = signUpSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0].message });
		}

		const { email, password, name } = parsed.data;

		try {
			await auth.api.signUpEmail({
				body: {
					email,
					password,
					name
				}
			});
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { message: error.message || 'Registration failed' });
			}
			return fail(500, { message: 'Unexpected error' });
		}

		return redirect(302, '/demo/better-auth');
	}
};
