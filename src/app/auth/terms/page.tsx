import { BRAND_NAME } from '@/lib/constants';
import { PublicNav } from '@/components/PublicNav';
import { SakuraBackground } from '@/components/SakuraPetal';

export const metadata = {
  title: `用户服务协议 - ${BRAND_NAME}`,
};

export default function TermsPage() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-background">
      <PublicNav absolute />

      <SakuraBackground count={10}>
        <div
          className="absolute w-[500px] h-[500px] rounded-full blur-[180px] opacity-20 dark:opacity-15"
          style={{ background: 'radial-gradient(circle, var(--accent-button) 0%, transparent 70%)', right: '-10%', top: '-10%', animation: 'float 10s ease-in-out infinite' }}
        />
      </SakuraBackground>

      <div className="relative z-10 max-w-[700px] mx-auto px-6 pt-28 pb-20 animate-slide-in-up">
        <div className="bg-card/80 dark:bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-8 md:p-10 shadow-lg">
          <h1 className="text-2xl font-medium text-foreground mb-2">用户服务协议</h1>
          <p className="text-sm text-muted-foreground mb-8">更新日期：2026年7月</p>

          <div className="text-sm text-foreground/80 leading-relaxed space-y-6">
            <section>
              <h2 className="text-base font-medium text-foreground mb-2">一、总则</h2>
              <p>
                欢迎使用 {BRAND_NAME}（以下简称&ldquo;本平台&rdquo;）。本协议是您与本平台之间关于使用本平台服务所订立的协议。请您仔细阅读本协议，特别是以粗体或下划线标注的条款。
                您通过注册、登录或使用本平台服务，即表示您已阅读、理解并同意接受本协议的全部条款。
              </p>
            </section>

            <section>
              <h2 className="text-base font-medium text-foreground mb-2">二、账号注册与管理</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>您在注册时应提供真实、准确、完整的个人信息，并在信息变更时及时更新。</li>
                <li>您注册的账号所有权归本平台所有，您仅拥有使用权。账号不得以任何形式转让、出借或售卖。</li>
                <li>您应对账号下的所有行为承担责任，请妥善保管账号和密码，因账号泄露导致的损失由您自行承担。</li>
                <li>如发现任何未经授权使用您账号的情况，您应立即通知本平台。</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-medium text-foreground mb-2">三、用户行为规范</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>您不得利用本平台从事任何违法违规活动，包括但不限于：传播违法信息、侵犯他人知识产权、进行网络攻击等。</li>
                <li>您不得干扰本平台的正常运行，不得使用任何自动化手段（爬虫、脚本等）对本平台进行不正当操作。</li>
                <li>您通过本平台创建的 OAuth 2.0 应用应符合相关法律法规，不得用于恶意目的。</li>
                <li>您不得利用本平台的身份认证服务进行欺诈、钓鱼或其他非法活动。</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-medium text-foreground mb-2">四、隐私保护</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>本平台重视您的隐私保护。我们仅收集提供身份认证服务所必需的信息。</li>
                <li>您的密码采用加密存储，本平台无法获知您的明文密码。</li>
                <li>我们不会将您的个人信息出售或共享给第三方，除非法律法规要求或经您明确授权。</li>
                <li>本平台采取合理的安全措施保护您的个人信息，但无法保证绝对的安全。</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-medium text-foreground mb-2">五、服务变更与终止</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>本平台有权根据业务需要修改、暂停或终止部分或全部服务，并尽可能提前通知。</li>
                <li>如您违反本协议，本平台有权暂停或终止您的账号，并保留追究法律责任的权利。</li>
                <li>您可以通过注销功能终止使用本平台服务，注销后相关数据将按照隐私政策处理。</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-medium text-foreground mb-2">六、免责声明</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>本平台按&ldquo;现状&rdquo;提供服务，不对服务的及时性、安全性、准确性作出任何明示或暗示的保证。</li>
                <li>因不可抗力、网络故障、系统维护等原因导致的服务中断，本平台不承担责任。</li>
                <li>您通过本平台接入的第三方应用，其行为和内容由该第三方负责，本平台不对其进行担保。</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-medium text-foreground mb-2">七、知识产权</h2>
              <p>
                本平台的所有内容，包括但不限于文字、图标、界面设计、软件代码等，其知识产权归本平台所有，受相关法律法规保护。未经许可，不得以任何形式复制、修改或传播。
              </p>
            </section>

            <section>
              <h2 className="text-base font-medium text-foreground mb-2">八、协议修改</h2>
              <p>
                本平台有权根据需要修改本协议的条款。修改后的协议将在平台上公布，继续使用本平台服务即视为您接受修改后的协议。
              </p>
            </section>

            <section>
              <h2 className="text-base font-medium text-foreground mb-2">九、法律适用与争议解决</h2>
              <p>
                本协议的订立、执行和解释适用中华人民共和国法律。因本协议产生的争议，双方应友好协商解决；协商不成的，任何一方均可向本平台所在地有管辖权的人民法院提起诉讼。
              </p>
            </section>


          </div>
        </div>
      </div>
    </main>
  );
}
