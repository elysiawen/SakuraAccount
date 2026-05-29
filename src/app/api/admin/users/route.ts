import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, deleteUser, updateUserRole, updateUser, updateUserPassword, getUserByUsername, logAudit } from '@/lib/auth';
import { requireAdmin } from '@/lib/require-session';
import { isValidEmail, validatePassword, validateNickname } from '@/lib/utils';
import {
    paramInvalid,
    adminUserIdRequired,
    adminCannotDeleteSelf,
    adminUserDeleteFailed,
    adminInvalidRole,
    adminCannotChangeSelfRole,
    adminUserUpdateFailed,
    adminUserListFailed,
    authWeakPassword,
    authUsernameExists,
} from '@/lib/api-response';
import { tApi } from '@/i18n/api-i18n';

const VALIDATION_KEY_MAP: Record<string, string> = {
  'PASSWORD_TOO_SHORT': 'validation.passwordTooShort',
  'PASSWORD_NEEDS_LETTER_AND_NUMBER': 'validation.passwordNeedsLetterAndNumber',
  'NICKNAME_EMPTY': 'validation.nicknameEmpty',
  'NICKNAME_TOO_LONG': 'validation.nicknameTooLong',
};

export async function GET(request: NextRequest) {
  try {
    const result = await requireAdmin();
    if ('error' in result) return result.error;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    const data = await getAllUsers(page, limit);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Admin users error:', error);
    return adminUserListFailed();
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const result = await requireAdmin();
    if ('error' in result) return result.error;
    const { user: admin } = result;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return adminUserIdRequired();
    }

    if (userId === admin.id) {
      return adminCannotDeleteSelf();
    }

    await deleteUser(userId);
    await logAudit(admin.id, 'admin_delete_user', { targetUserId: userId }, 'admin', 'admin');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete user error:', error);
    return adminUserDeleteFailed();
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const result = await requireAdmin();
    if ('error' in result) return result.error;
    const { user: admin } = result;

    const body = await request.json();
    const { id, role } = body;

    if (!id || !role) {
      return paramInvalid(await tApi('sys.paramInvalid'));
    }

    if (!['user', 'admin'].includes(role)) {
      return adminInvalidRole();
    }

    if (id === admin.id) {
      return adminCannotChangeSelfRole();
    }

    await updateUserRole(id, role);
    await logAudit(admin.id, 'admin_update_user_role', { targetUserId: id, newRole: role }, 'admin', 'admin');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin update user error:', error);
    return adminUserUpdateFailed();
  }
}

export async function PUT(request: NextRequest) {
  try {
    const result = await requireAdmin();
    if ('error' in result) return result.error;
    const { user: admin } = result;

    const body = await request.json();
    const { id, username, nickname, email, newPassword } = body;

    if (!id) {
      return adminUserIdRequired();
    }

    if (email && !isValidEmail(email)) {
      return paramInvalid(await tApi('sys.paramInvalid'));
    }

    const nicknameError = validateNickname(nickname);
    if (nicknameError) {
      const mapped = VALIDATION_KEY_MAP[nicknameError];
      return paramInvalid(mapped ? await tApi(mapped) : nicknameError);
    }

    if (username) {
      const existing = await getUserByUsername(username);
      if (existing && String(existing.id) !== String(id)) {
        return authUsernameExists();
      }
    }

    await updateUser(id, { username, nickname: nickname?.trim(), email });

    if (newPassword) {
      const passwordError = validatePassword(newPassword);
      if (passwordError) {
        const mapped = VALIDATION_KEY_MAP[passwordError];
        return authWeakPassword(mapped ? await tApi(mapped) : passwordError);
      }
      await updateUserPassword(id, newPassword);
    }

    await logAudit(admin.id, 'admin_update_user', { targetUserId: id, nickname, email, passwordChanged: !!newPassword }, 'admin', 'admin');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin update user error:', error);
    return adminUserUpdateFailed();
  }
}
