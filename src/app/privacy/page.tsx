import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px", fontFamily: "system-ui" }}>
      <h1 style={{ marginBottom: 24 }}>プライバシーポリシー</h1>

      <nav style={{ marginBottom: 32 }}>
        <Link href="/login">← ログインページへ戻る</Link>
      </nav>

      <section style={{ lineHeight: 1.8, fontSize: 15 }}>
        <p>
          Workforce Nexus（以下「当サービス」）は、ユーザーの個人情報の保護を重要と考え、
          以下のとおりプライバシーポリシーを定めます。
        </p>

        <h2 style={{ marginTop: 32, marginBottom: 12 }}>1. 収集する情報</h2>
        <p>当サービスでは、以下の情報を収集します。</p>
        <ul style={{ paddingLeft: 24, marginTop: 8 }}>
          <li>氏名、メールアドレス（アカウント登録時）</li>
          <li>会社名、テナントID（組織登録時）</li>
          <li>勤怠情報（出退勤時刻、休憩時間、労働時間）</li>
          <li>日報情報（業務内容、訪問件数等）</li>
          <li>顔認証データ（顔認証機能を利用する場合のみ）</li>
          <li>アクセスログ、IPアドレス、Cookie情報</li>
        </ul>

        <h2 style={{ marginTop: 32, marginBottom: 12 }}>2. 情報の利用目的</h2>
        <p>収集した情報は、以下の目的で利用します。</p>
        <ul style={{ paddingLeft: 24, marginTop: 8 }}>
          <li>サービスの提供および運営</li>
          <li>ユーザー認証およびセキュリティの確保</li>
          <li>サービスの改善および新機能の開発</li>
          <li>お問い合わせへの対応</li>
          <li>利用状況の分析</li>
        </ul>

        <h2 style={{ marginTop: 32, marginBottom: 12 }}>3. 広告の配信について</h2>
        <p>
          当サービスの無料プランでは、第三者配信の広告サービスを利用して広告を表示しています。
        </p>
        <h3 style={{ marginTop: 16, marginBottom: 8 }}>Google AdSense</h3>
        <p>
          当サービスでは、Google LLC が提供する Google AdSense を利用しています。
          Google AdSense は、Cookie を使用してユーザーのアクセス情報に基づいた広告を配信します。
        </p>
        <ul style={{ paddingLeft: 24, marginTop: 8 }}>
          <li>
            Google は Cookie を使用して、当サービスや他のウェブサイトへのアクセス情報に基づき、
            適切な広告を表示します。
          </li>
          <li>
            ユーザーは、
            <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">
              Google 広告設定
            </a>
            からパーソナライズ広告を無効にできます。
          </li>
          <li>
            詳細については、
            <a href="https://policies.google.com/technologies/ads?hl=ja" target="_blank" rel="noopener noreferrer">
              Google の広告に関するポリシー
            </a>
            をご参照ください。
          </li>
        </ul>

        <h2 style={{ marginTop: 32, marginBottom: 12 }}>4. Cookie の利用</h2>
        <p>当サービスでは、以下の目的で Cookie を使用しています。</p>
        <ul style={{ paddingLeft: 24, marginTop: 8 }}>
          <li>ログインセッションの維持</li>
          <li>ユーザー設定の保存</li>
          <li>広告の配信および効果測定（Google AdSense）</li>
          <li>アクセス解析</li>
        </ul>
        <p style={{ marginTop: 8 }}>
          ブラウザの設定により Cookie を無効にすることができますが、
          一部の機能が正常に動作しなくなる場合があります。
        </p>

        <h2 style={{ marginTop: 32, marginBottom: 12 }}>5. 第三者への情報提供</h2>
        <p>
          当サービスは、以下の場合を除き、ユーザーの個人情報を第三者に提供しません。
        </p>
        <ul style={{ paddingLeft: 24, marginTop: 8 }}>
          <li>ユーザーの同意がある場合</li>
          <li>法令に基づく場合</li>
          <li>人の生命、身体または財産の保護のために必要な場合</li>
          <li>サービスの運営に必要な範囲で業務委託先に提供する場合</li>
        </ul>

        <h2 style={{ marginTop: 32, marginBottom: 12 }}>6. 情報の管理</h2>
        <p>
          当サービスは、ユーザーの個人情報を適切に管理し、不正アクセス、紛失、
          改ざん、漏洩の防止に努めます。データは暗号化された通信（TLS）を通じて送受信され、
          パスワードはハッシュ化して保存されます。
        </p>

        <h2 style={{ marginTop: 32, marginBottom: 12 }}>7. データの保持と削除</h2>
        <p>
          テナント（会社）のアカウントが削除された場合、関連するすべての個人情報は
          速やかに削除されます。ユーザーは管理者を通じて個人情報の削除を要求できます。
        </p>

        <h2 style={{ marginTop: 32, marginBottom: 12 }}>8. プライバシーポリシーの変更</h2>
        <p>
          当サービスは、必要に応じて本ポリシーを変更することがあります。
          重要な変更がある場合は、サービス内で通知します。
        </p>

        <h2 style={{ marginTop: 32, marginBottom: 12 }}>9. お問い合わせ</h2>
        <p>
          プライバシーに関するお問い合わせは、以下までご連絡ください。
        </p>
        <p style={{ marginTop: 8 }}>
          メール: <a href="mailto:support@workforce-nexus.jp">support@workforce-nexus.jp</a>
        </p>

        <p style={{ marginTop: 32, color: "var(--color-text-secondary)", fontSize: 13 }}>
          最終更新日: 2026年3月21日
        </p>
      </section>
    </main>
  );
}
