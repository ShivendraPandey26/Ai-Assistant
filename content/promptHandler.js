class PromptHandler {
  constructor(result, message) {
    this.initializeApiInfo(result.DATA);
    this.menus = result.MENUS;
    this.message = message;
    this.selectedText = window.getSelection().toString();
    this.promptUi = new PromptUi(message.title);
  }

  initializeApiInfo({
    gptEndpoint,
    geminiEndpoint,
    gptKey,
    geminiKey,
    selectedAI,
    grokEndpoint,
    grokKey,
  }) {
    this.openAiEndPoint = gptEndpoint;
    this.geminiEndPoint = geminiEndpoint;
    this.grokEndPoint = grokEndpoint;

    this.openAPIKey = gptKey;
    this.geminiAPIKey = geminiKey;
    this.grokAPIKey = grokKey;

    this.selectedAI = selectedAI;
  }

  // Method to create the API payload based on the selected menu
  createGptPayload() {
    const content = this.getUserContent(this.message);

    if (!content) return "";

    const payload = {
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content },
      ],
      model: "gpt-4o-mini",
    };

    return payload;
  }

  createGeminiPayload() {
    const text = this.getUserContent(this.message);

    if (!text) return "";

    return {
      contents: [
        {
          parts: [{ text }],
        },
      ],
    };
  }

  createGrokPayload() {
    const content = this.getUserContent(this.message);

    if (!content) return "";

    return {
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content },
      ],
      model: "grok-beta",
      stream: false,
      temperature: 0,
    };
  }

  createOllamaPayload() {
    const content = this.getUserContent(this.message);

    if (!content) return "";

    return {
      model: this.selectedAI,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content },
      ],
      stream: false,
    };
  }

  // Helper method to generate user content based on the selected menu
  getUserContent(menu) {
    const {
      correctGrammar,
      codeReview,
      generatePost,
      summarize,
      askAnything,
      generateCode,
    } = this.menus;

    if (menu.key === correctGrammar.key) {
      return `Correct this text grammatically and give me only the corrected text not any other explanation: ${this.selectedText}`;
    }

    if (menu.key === generatePost.key) {
      return `Generate a new post based on the following content: ${this.selectedText}`;
    }

    if (menu.key === summarize.key) {
      return `Summarize the following text: ${this.selectedText}`;
    }

    if (menu.key === codeReview?.key) {
      return `
  Please review the following code for the following aspects:
  1. Proper variable naming conventions
  2. Code formatting
  3. Comments
  4. Efficiency
  5. Avoid hardcoded values
  6. Edge case handling
  7. Redundant code
  Here is the code to review:
  \`\`\`
  ${this.selectedText}
  \`\`\`
  Only provide review and improved code if necessary. Avoid long explanations.
    `;
    }

    if (menu.key === generateCode?.key) {
      const subMenus = this.menus?.generateCodeOfThisQuestion?.subMenus || [];

      const subMenuKey = this.message?.subMenuKey;
      const subMenu = subMenus.find((sub) => sub.key === subMenuKey);
      const language = subMenu?.title || "code";

      return `
Please generate clean, efficient, and readable ${language} code for the following task:
\`\`\`
${this.selectedText}
\`\`\`
Guidelines:
1. Use proper variable naming conventions.
2. Ensure code is well-formatted. 
3. Include comments where necessary.
4. Avoid hardcoded values.
5. Handle edge cases.
6. Remove any redundant code.
7. Provide only the code without any additional explanations.

Output only the code in a ${language} code block. No explanation needed unless assumptions are critical.
    `;
    }

    if (menu.key === this.menus.translate?.key) {
      const subMenu = menu.subMenus?.find(
        (sub) => sub.key === this.message?.subMenuKey
      );

      if (!subMenu) return "";

      const promptMap = {
        englishToHindi: `Translate the following English text to Hindi:\n${this.selectedText}`,
        hindiToEnglish: `Translate the following Hindi text to English:\n${this.selectedText}`,
      };

      return promptMap[subMenu.key] || "";
    }

    if (menu.key === askAnything.key) {
      return `Tell me about this: ${this.selectedText}`;
    }

    if (menu.key) {
      return `search about :${menu.title.toLowerCase()} ${this.selectedText}`;
    }

    return "";
  }

  // Methods to handle the API call
  callGptApi(payload) {
    this.promptUi.showLoading();
    return fetch(this.openAiEndPoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.openAPIKey}`,
      },
      body: JSON.stringify(payload),
    })
      .then((response) => response.json())
      .then((data) => {
        const result = data.choices[0]?.message?.content || "No response";
        this.promptUi.showModal(`<p>${result}</p>`, result);
      })
      .catch((error) => {
        this.promptUi.showModal(`<p>Error: ${error.message}</p>`);
      })
      .finally(() => {
        this.promptUi.hideLoading();
      });
  }

  callGeminiAPI(payload) {
    this.promptUi.showLoading();
    return fetch(`${this.geminiEndPoint}?key=${this.geminiAPIKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Error: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        const result =
          data?.candidates?.[0]?.content?.parts?.[0]?.text ||
          "No response from the API.";
        this.promptUi.showModal(`<p>${result}</p>`, result);
      })
      .catch((error) => {
        this.promptUi.showModal(`<p>Error: ${error.message}</p>`);
      })
      .finally(() => {
        this.promptUi.hideLoading();
      });
  }

  callGrokAPI(payload) {
    this.promptUi.showLoading();
    return fetch(this.grokEndPoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.grokAPIKey}`,
      },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Error: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        const result =
          data?.choices?.[0]?.message?.content || "No response from the API.";
        this.promptUi.showModal(`<p>${result}</p>`, result);
      })
      .catch((error) => {
        this.promptUi.showModal(`<p>Error: ${error.message}</p>`);
      })
      .finally(() => {
        this.promptUi.hideLoading();
      });
  }

  /*
   * Some models provide Markdown formatted data, but it doesn't parse properly, hence removing that part here.
   */
  removeMarkdownMarkers(markdownText) {
    const regex = /```markdown\n([\s\S]*?)\n```/g;
    return markdownText.replace(regex, "$1"); // $1 refers to the captured group
  }

  /*
   * Called the API through `background.js` because of Chrome's CORS policy.
   */
  callOllamaApi(payload) {
    this.promptUi.showLoading();
    chrome.runtime.sendMessage(
      { action: "callOllamaApi", payload },
      (response) => {
        if (!response.success) {
          this.promptUi.showModal(`<p>Error: ${response.error}</p>`);
          this.promptUi.hideLoading();
        } else {
          const res = response.data.message.content.replace(
            /<think>[\s\S]*?<\/think>/g, // It will remove the reasoning portion
            ""
          );
          const result = this.removeMarkdownMarkers(res) || "No response";
          this.promptUi.showModal(`<p>${result}</p>`, result);
          this.promptUi.hideLoading();
        }
      }
    );
  }

  // Main method to handle the menu action and call the API
  handle() {
    try {
      if (!this.selectedText) {
        this.promptUi.showModal(`<p>Please select something</p>`);
        return;
      }

      const actionMap = {
        gpt: {
          createPayload: () => this.createGptPayload(),
          callApi: (payload) => this.callGptApi(payload),
        },
        grok: {
          createPayload: () => this.createGrokPayload(),
          callApi: (payload) => this.callGrokAPI(payload),
        },
        gemini: {
          createPayload: () => this.createGeminiPayload(),
          callApi: (payload) => this.callGeminiAPI(payload),
        },
        ollama: {
          createPayload: () => this.createOllamaPayload(),
          callApi: (payload) => this.callOllamaApi(payload),
        },
      };

      const { createPayload, callApi } =
        actionMap[
          ["gpt", "grok", "gemini"].includes(this.selectedAI)
            ? this.selectedAI
            : "ollama"
        ] || actionMap.gemini;

      const payload = createPayload();

      callApi(payload);
    } catch (error) {
      this.promptUi.showModal(`<p>Error: ${error.message}</p>`);
    }
  }
}
