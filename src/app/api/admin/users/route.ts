import { NextRequest, NextResponse } from 'next/server';
import { getSession, getAllUsers, deleteUser, updateUserRole, updateUser, updateUserPassword, getUserByUsername, logAudit } from '@/lib/auth';
import { isValidEmail } from '@/lib/utils';
import { cookies } from 'next/headers';

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('account_session')?.value;

  if (!sessionId) return null;

  const user = await getSession(sessionId);
  if (!user || user.role !== 'admin') return null;

  return user;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const result = await getAllUsers(page, limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: '请指定用户ID' }, { status: 400 });
    }

    if (parseInt(userId) === admin.id) {
      return NextResponse.json({ error: '不能删除自己的账号' }, { status: 400 });
    }

    await deleteUser(parseInt(userId));

    await logAudit(admin.id, 'admin_delete_user', { targetUserId: userId }, 'admin', 'admin');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete user error:', error);
    return NextResponse.json({ error: '删除用户失败' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const { id, role } = body;

    if (!id || !role) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    if (!['user', 'admin'].includes(role)) {
      return NextResponse.json({ error: '无效的角色' }, { status: 400 });
    }

    if (id === admin.id) {
      return NextResponse.json({ error: '不能修改自己的角色' }, { status: 400 });
    }

    await updateUserRole(id, role);

    await logAudit(admin.id, 'admin_update_user_role', { targetUserId: id, newRole: role }, 'admin', 'admin');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin update user error:', error);
    return NextResponse.json({ error: '更新用户失败' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const { id, username, nickname, email, newPassword } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
    }

    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: '请输入有效的邮箱地址' }, { status: 400 });
    }

    // Check username uniqueness if changed
    if (username) {
      const existing = await getUserByUsername(username);
      if (existing && String(existing.id) !== String(id)) {
        return NextResponse.json({ error: '用户名已被占用' }, { status: 400 });
      }
    }

    // Update profile
    await updateUser(id, { username, nickname, email });

    // Update password if provided
    if (newPassword) {
      if (newPassword.length < 8) {
        return NextResponse.json({ error: '密码长度至少8位' }, { status: 400 });
      }
      await updateUserPassword(id, newPassword);
    }

    await logAudit(admin.id, 'admin_update_user', { targetUserId: id, nickname, email, passwordChanged: !!newPassword }, 'admin', 'admin');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin update user error:', error);
    return NextResponse.json({ error: '更新用户失败' }, { status: 500 });
  }
}
