import { Controller, Get, Query, Res } from "@nestjs/common";
import { ApiOperation, ApiExcludeController } from "@nestjs/swagger";
import { Response } from "express";

@Controller("test")
@ApiExcludeController()
export class AuthTestPageController {
  @Get("success")
  @ApiOperation({
    summary: "OAuth 성공 테스트 페이지",
    description: "OAuth 로그인 성공 후 리다이렉트되는 테스트 페이지",
  })
  authSuccess(
    @Query("token") token: string,
    @Query("refresh_token") refreshToken: string,
    @Query("user_id") userId: string,
    @Res() res: Response,
  ): void {
    const html = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OAuth 로그인 성공</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f8f9fa;
          }
          .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .success {
            color: #28a745;
            margin-bottom: 20px;
          }
          .token-box {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            margin: 10px 0;
            border-left: 4px solid #007bff;
          }
          .copy-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            margin-left: 10px;
          }
          .copy-btn:hover {
            background: #0056b3;
          }
          pre {
            background: #f1f3f4;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
            white-space: pre-wrap;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="success">✅ Google OAuth 로그인 성공!</h1>
          
          <div class="token-box">
            <h3>👤 사용자 ID</h3>
            <p><strong>${userId}</strong></p>
          </div>

          <div class="token-box">
            <h3>🔑 액세스 토큰 (JWT)</h3>
            <button class="copy-btn" onclick="copyToClipboard('accessToken')">복사</button>
            <pre id="accessToken">${token}</pre>
          </div>

          ${
            refreshToken
              ? `
          <div class="token-box">
            <h3>🔄 리프레시 토큰</h3>
            <button class="copy-btn" onclick="copyToClipboard('refreshToken')">복사</button>
            <pre id="refreshToken">${refreshToken}</pre>
          </div>
          `
              : ""
          }

          <div class="token-box">
            <h3>🧪 테스트 방법</h3>
            <p>위의 JWT 토큰을 복사해서 다음과 같이 API를 테스트할 수 있습니다:</p>
            <pre>curl -X GET "http://localhost:8080/health" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"</pre>
          </div>

          <div class="token-box">
            <h3>🔍 JWT 토큰 디코딩</h3>
            <p><a href="https://jwt.io" target="_blank">JWT.io</a>에서 토큰을 디코딩해서 내용을 확인할 수 있습니다.</p>
          </div>
        </div>

        <script>
          function copyToClipboard(elementId) {
            const element = document.getElementById(elementId);
            const text = element.textContent;
            navigator.clipboard.writeText(text).then(() => {
              alert('토큰이 클립보드에 복사되었습니다!');
            });
          }
        </script>
      </body>
      </html>
    `;

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  }

  @Get("error")
  @ApiOperation({
    summary: "OAuth 실패 테스트 페이지",
    description: "OAuth 로그인 실패 후 리다이렉트되는 테스트 페이지",
  })
  authError(
    @Query("error") error: string,
    @Query("message") message: string,
    @Res() res: Response,
  ): void {
    const html = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OAuth 로그인 실패</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f8f9fa;
          }
          .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .error {
            color: #dc3545;
            margin-bottom: 20px;
          }
          .error-box {
            background: #f8d7da;
            padding: 15px;
            border-radius: 4px;
            margin: 10px 0;
            border-left: 4px solid #dc3545;
          }
          .retry-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin-top: 20px;
          }
          .retry-btn:hover {
            background: #0056b3;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="error">❌ Google OAuth 로그인 실패</h1>
          
          <div class="error-box">
            <h3>🚨 에러 코드</h3>
            <p><strong>${error}</strong></p>
          </div>

          <div class="error-box">
            <h3>📝 에러 메시지</h3>
            <p>${decodeURIComponent(message || "알 수 없는 오류가 발생했습니다.")}</p>
          </div>

          <div class="error-box">
            <h3>🔧 해결 방법</h3>
            <ul>
              <li>Google Cloud Console에서 OAuth 설정을 확인하세요</li>
              <li>리다이렉트 URI가 올바르게 설정되어 있는지 확인하세요</li>
              <li>환경 변수(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)를 확인하세요</li>
              <li>네트워크 연결을 확인하세요</li>
            </ul>
          </div>

          <a href="/auth/v1/google/login" class="retry-btn">다시 시도</a>
        </div>
      </body>
      </html>
    `;

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  }
}
