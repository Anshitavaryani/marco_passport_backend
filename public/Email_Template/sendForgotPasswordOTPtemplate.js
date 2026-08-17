const config = require("../../../config/config");

// Rewritten to match the same bulletproof table-based layout used in
// sendEmailVerificationFormat.js. The previous version used CSS flexbox
// on <body>/.container for centering — flexbox has no support at all in
// Outlook desktop (it renders HTML email with Word's engine, not a real
// browser engine), so this would have rendered unstyled/broken there.
// Given this app's target market (US/Canada small businesses, where
// Outlook/Microsoft 365 is common), that's a real rendering bug, not
// just a style preference — so this reuses the same table-based
// structure that already works correctly in the sibling template rather
// than inventing a new layout.
const forgotPasswordSendOTPFormat = (otp) => {
  return `<!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>Forgot Password</title>
        <style media="all" type="text/css">
          @media only screen and (max-width: 640px) {
            .main p,
            .main td,
            .main span {
              font-size: 16px !important;
            }

            .wrapper {
              padding: 8px !important;
            }

            .content {
              padding: 0 !important;
            }

            .container {
              padding: 0 !important;
              padding-top: 8px !important;
              width: 100% !important;
            }

            .main {
              border-left-width: 0 !important;
              border-radius: 0 !important;
              border-right-width: 0 !important;
            }
          }
          @media all {
            .ExternalClass {
              width: 100%;
            }

            .ExternalClass,
            .ExternalClass p,
            .ExternalClass span,
            .ExternalClass font,
            .ExternalClass td,
            .ExternalClass div {
              line-height: 100%;
            }
          }
        </style>
      </head>
      <body
        style="
          font-family: Helvetica, sans-serif;
          -webkit-font-smoothing: antialiased;
          font-size: 16px;
          line-height: 1.3;
          -ms-text-size-adjust: 100%;
          -webkit-text-size-adjust: 100%;
          background-color: #f4f5f6;
          margin: 0;
          padding: 0;
        "
      >
        <table
          role="presentation"
          border="0"
          cellpadding="0"
          cellspacing="0"
          class="body"
          style="
            border-collapse: separate;
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
            background-color: #f4f5f6;
            width: 100%;
          "
          width="100%"
          bgcolor="#f4f5f6"
        >
          <tr>
            <td
              style="
                font-family: Helvetica, sans-serif;
                font-size: 16px;
                vertical-align: top;
              "
              valign="top"
            >
              &nbsp;
            </td>
            <td
              class="container"
              style="
                font-family: Helvetica, sans-serif;
                font-size: 16px;
                vertical-align: top;
                max-width: 600px;
                padding: 0;
                padding-top: 40px;
                padding-bottom: 40px;
                width: 600px;
                margin: 0 auto;
              "
              width="600"
              valign="top"
            >
              <div
                class="content"
                style="
                  box-sizing: border-box;
                  display: block;
                  margin: 0 auto;
                  max-width: 600px;
                  padding: 0;
                "
              >
                <span
                  class="preheader"
                  style="
                    color: transparent;
                    display: none;
                    height: 0;
                    max-height: 0;
                    max-width: 0;
                    opacity: 0;
                    overflow: hidden;
                    mso-hide: all;
                    visibility: hidden;
                    width: 0;
                  "
                  >Password Reset Code</span
                >
                <table
                  role="presentation"
                  border="0"
                  cellpadding="0"
                  cellspacing="0"
                  class="main"
                  style="
                    border-collapse: separate;
                    mso-table-lspace: 0pt;
                    mso-table-rspace: 0pt;
                    background: #ffffff;
                    border: 1px solid #eaebed;
                    border-radius: 16px;
                    width: 100%;
                  "
                  width="100%"
                >
                  <tr>
                    <td
                      class="wrapper"
                      style="
                        font-family: Helvetica, sans-serif;
                        font-size: 16px;
                        vertical-align: top;
                        box-sizing: border-box;
                        padding: 24px;
                      "
                      valign="top"
                    >
                      <p
                        style="
                          font-family: Helvetica, sans-serif;
                          font-size: 16px;
                          font-weight: normal;
                          margin: 0;
                          margin-bottom: 16px;
                        "
                      >
                        Hi,
                      </p>
                      <p
                        style="
                          font-family: Helvetica, sans-serif;
                          font-size: 16px;
                          font-weight: normal;
                          margin: 0;
                          margin-bottom: 16px;
                        "
                      >
                        A password reset was requested for your ${config.app_name} account.
                        Use the code below to continue. This code is valid for 5 minutes.
                      </p>
                      <table
                        role="presentation"
                        border="0"
                        cellpadding="0"
                        cellspacing="0"
                        class="btn btn-primary"
                        style="
                          border-collapse: separate;
                          mso-table-lspace: 0pt;
                          mso-table-rspace: 0pt;
                          box-sizing: border-box;
                          width: 100%;
                          min-width: 100%;
                        "
                        width="100%"
                      >
                        <tbody>
                          <tr>
                            <td
                              align="left"
                              style="
                                font-family: Helvetica, sans-serif;
                                font-size: 16px;
                                vertical-align: top;
                                padding-bottom: 16px;
                              "
                              valign="top"
                            >
                              <table
                                role="presentation"
                                border="0"
                                cellpadding="0"
                                cellspacing="0"
                                style="
                                  border-collapse: separate;
                                  mso-table-lspace: 0pt;
                                  mso-table-rspace: 0pt;
                                  width: auto;
                                "
                              >
                                <tbody>
                                  <tr>
                                    <td
                                      style="
                                        font-family: Helvetica, sans-serif;
                                        font-size: 16px;
                                        vertical-align: top;
                                        border-radius: 4px;
                                        text-align: center;
                                        background-color: #0867ec;
                                      "
                                      valign="top"
                                      align="center"
                                      bgcolor="#0867ec"
                                    >
                                      <span
                                        style="
                                          border: solid 2px #0867ec;
                                          border-radius: 4px;
                                          box-sizing: border-box;
                                          display: inline-block;
                                          font-size: 20px;
                                          font-weight: bold;
                                          letter-spacing: 4px;
                                          margin: 0;
                                          padding: 12px 24px;
                                          text-transform: uppercase;
                                          background-color: #0867ec;
                                          border-color: #0867ec;
                                          color: #ffffff;
                                        "
                                        >${otp}</span
                                      >
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      <p
                        style="
                          font-family: Helvetica, sans-serif;
                          font-size: 0.7em;
                          font-weight: normal;
                          margin: 0;
                          margin-bottom: 16px;
                        "
                      >
                        If you did not request a password reset, please ignore this email —
                        your password will not be changed.
                      </p>
                      <p
                        style="
                          font-family: Helvetica, sans-serif;
                          font-size: 0.8em;
                          font-weight: normal;
                          margin: 0;
                          margin-bottom: 16px;
                        "
                      >
                        Regards,
                        <br />
                        ${config.app_name}
                      </p>
                    </td>
                  </tr>
                </table>
                <div
                  class="footer"
                  style="
                    clear: both;
                    padding-top: 24px;
                    text-align: center;
                    width: 100%;
                  "
                >
                  <table
                    role="presentation"
                    border="0"
                    cellpadding="0"
                    cellspacing="0"
                    style="
                      border-collapse: separate;
                      mso-table-lspace: 0pt;
                      mso-table-rspace: 0pt;
                      width: 100%;
                    "
                    width="100%"
                  >
                    <tr>
                      <td
                        class="content-block"
                        style="
                          font-family: Helvetica, sans-serif;
                          vertical-align: top;
                          color: #9a9ea6;
                          font-size: 14px;
                          text-align: center;
                        "
                        valign="top"
                        align="center"
                      >
                        This is an automated message from ${config.app_name}. Please don't reply to this email.
                      </td>
                    </tr>
                  </table>
                </div>
              </div>
            </td>
            <td
              style="
                font-family: Helvetica, sans-serif;
                font-size: 16px;
                vertical-align: top;
              "
              valign="top"
            >
              &nbsp;
            </td>
          </tr>
        </table>
      </body>
    </html>
    `;
};

module.exports = forgotPasswordSendOTPFormat;
