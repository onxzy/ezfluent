console.log('Starting ezfluent ...');

var articles = [];
var quiz;

// Message listener
browser.runtime.onMessage.addListener((msg) => {
    msg = JSON.parse(msg);
    console.log('got network data')
    const data =JSON.parse(msg.data)
    if (msg.type == 'quiz') initQuiz(data);
    if (msg.type == 'articles') initArticles(data);
});

function initBanner() {
    const div = document.createElement('div');

    div.innerHTML = `
    <button id="GF_show_btn">SHOW</button>
    <button id="GF_auto_btn">AUTO QUIZ</button>
    <button id="GF_full_auto_btn">FULL AUTO</button>
    <button id="GF_full_auto_retake_btn">FULL AUTO AND RETAKE</button>`;

    div.style = "position: absolute; top: 0; left: 50%;"

    document.body.appendChild(div);
    document.getElementById('GF_show_btn').addEventListener('click', inputAns);
    document.getElementById('GF_auto_btn').addEventListener('click', auto_quiz);
    document.getElementById('GF_full_auto_btn').addEventListener('click', auto_articles);
    document.getElementById('GF_full_auto_retake_btn').addEventListener('click', auto_articles_retake);
}

function initArticles(data) {
    // console.log(data);
    function addArticle(groupId, articleId, type) {
        function isIn(articleId) {
            for (let i = 0; i < articles.length; i++) {
                if (articles[i].articleId == articleId) return true;
            }
            return false;
        }
    
        if (isIn(articleId)) return;
    
        articles.push({
            articleId,
            groupId,
            type,
            done: false,
        })
    }

    const previousArticlesLenght = articles.length
    data.forEach((d) => {
        addArticle(d.groupId, d.articleId, d.type);
    })
    console.log(`Got ${articles.length - previousArticlesLenght} new articles`)
    // document.querySelectorAll("div[href='/app/dashboard/training-path/321037076/howto/81862/88711']");
}

function auto_articles_retake(e) {
    auto_articles(e, true)
}

async function auto_articles(e, retake) {
    const do_article_result = await do_article(retake)
    if (do_article_result) {
        console.log('1 article done !')
        auto_articles(e, retake);
    }
}

async function do_article(retake) {
    console.log('auto_articles')
    console.log(articles)
    let article;
    let article_index = 0;
    for (let i = 0; i < articles.length; i++) {
        if (!articles[i].done) {
            article = articles[i];
            article_index = i;
            break;
        }
    }
    if(!article) {
        console.log('No undone article found')
        return 0
    }

    console.log(`Doing article ${article.groupId}/${article.articleId}`)
    const article_div = document.querySelectorAll(`div[href='/app/dashboard/training-path/321037076/${article.type.replace('-', '')}/${article.groupId}/${article.articleId}']`)[0];
    if (!article_div) {
        console.error('Unable to find article div')
        return 0
    }

    article_div.scrollIntoView()
    article_div.click()

    quiz = null; // Reset quiz

    let wait_time = 0
    let quiz_btn;
    while (wait_time <= 300) {
        quiz_btn = document.getElementById('practice');
        if (quiz_btn) break
        wait_time += 1
        await delay(100);
    }
    if (!quiz_btn) {
        console.error('Article loading timeout')
    }
    console.log('Article loaded')

    quiz_btn.click()

    wait_time = 0
    while (wait_time <= 300) {
        if (quiz) break
        wait_time += 1
        await delay(100);
    }
    if (!quiz) {
        console.error('Quiz loading timeout')
    }
    console.log('Quiz loaded, launching auto quiz')
    await auto_quiz(null, retake);
    console.log('Auto quiz completed')

    articles[article_index].done = true;
    return 1
}



function initQuiz(data) {
    function questionDecode(q) {
        let title = q.q;
        let type = q.qt;
    
        let options;
        if (q.o3) options = [q.o1, q.o2, ... q.o3];
        else options = [q.o1, q.o2];
    
        let answers = q.ans;
        if (q.qt != 'sl') {
            if (!Array.isArray(q.ans)) {
                answers = q.ans.split(',');
            }
        }
    
        return {title, type, answers, options, optionType: q.ot};
    }

    console.log('Initializing new quiz...');
    const questionList = [];
    data.q.forEach((q) => {
        questionList.push(questionDecode(q));
    });
    quiz = {questionList};
    console.log('New quiz initialized');
}

async function auto_quiz(e, retake) {
    if (document.getElementsByClassName('QuizResults__retake')[0]) {
        if (retake) {
            document.getElementsByClassName('QuizResults__retake')[0].click()
            console.log('Retaking quiz')
        } else {
            console.log('Quiz already done')
            return;
        }
    }

    for (let i = 0; i < quiz.questionList.length; i++) {
        inputAns(e, true);
        await delay(500 + Math.random(2)*500);
        // await delay(1000 + Math.random(4)*1000);
        if (document.getElementsByClassName('Question__submit')) document.getElementsByClassName('Question__submit')[0].click()
        if (document.getElementsByClassName('Question__next')) document.getElementsByClassName('Question__next')[0].click()
    }
}

function inputAns(_, autoClick) {
    function getQuestion() {
        function htmlDecode(input) {
            const doc = new DOMParser().parseFromString(input, "text/html");
            return doc.documentElement.textContent;
        }
    
        const qWrapper = document.getElementsByClassName('Question')[0];
        const qTitleWrapper = qWrapper.getElementsByClassName('Stem__answer-block')[0];
        const qTitle = htmlDecode(qTitleWrapper.innerHTML.replace(/<\/?[^>]+(>|$)/g, "").trim());
    
        console.log(`Getting question data for question : "${qTitle}"`);
    
        let i;
        for (i = 0; i < quiz.questionList.length; i++) {
            const question = quiz.questionList[i];
            // console.log(questionList)
            // console.log(htmlDecode(q.title.replace(/<\/?[^>]+(>|$)/g, "").replace(/[\r\n]/gm, '')))
            if (htmlDecode(question.title.replace(/<\/?[^>]+(>|$)/g, "").replace(/[\r\n]/gm, '')) == qTitle) {
                break;
            }
        }
        return {question : quiz.questionList[i], qWrapper};
    }

    function showCorrectOption(optionNode, i, text) {
        optionNode.textContent = '';
        const index = document.createElement('strong');
        index.textContent = i;
        index.style.color = 'green';
        optionNode.appendChild(index);

        const optionText = document.createElement('span');
        optionText.textContent = ' ' + text;
        optionNode.appendChild(optionText);
    }

    const {question, qWrapper} = getQuestion();
    console.info(question);

    // TYPE : fill-in-the-gaps
    if (question.type == 'fg') { 

        if (question.optionType == 'oT') { // output-text
            for (let j = 0; j < qWrapper.querySelectorAll('input.Stem__answer_non-arabic').length; j++) {
                const input = qWrapper.querySelectorAll('input.Stem__answer_non-arabic')[j];
                input.value = question.answers[j].ans[0];
                reactTriggerChange(input);
            }
        } else if (question.optionType == 'oTB') { // output-text-button
            const optionsWrapper = qWrapper.getElementsByClassName('Question__fill-button');

            for (let j = 0; j < question.answers.length; j++) {
                const ans = question.answers[j];
                const ansText = question.options[ans-1];

                for (let k = 0; k < optionsWrapper.length; k++) {
                    const option = optionsWrapper[k];
                    if (option.innerText == ansText) {
                        showCorrectOption(option, j+1, ansText)
                        option.id = 'GF_click-'+j;
                        if (autoClick) option.click();
                    }
                }
            }
        } else {
            console.error(`Unkown option type : ${question.optionType}`);
        }

    // TYPE : multi-choice
    } else if (question.type == 'mc') {

        const optionsWrapper = qWrapper.getElementsByClassName('Question__options')[0];

        optionsWrapper.childNodes.forEach(option => {
            question.answers.forEach((ans) => {
                const ansText = question.options[ans-1];
                if (option.innerText == ansText) {
                    option.style.border = '2px solid green';
                    option.id = 'GF_click';
                    if (autoClick) option.click();
                }
            });
        });

    // TYPE : scrambled sentence
    } else if (question.type == 'ss') {

        const optionsWrapper = qWrapper.getElementsByClassName('Question_type_scrambled-sentence__unselected-box')[0];

        for (let j = 0; j < question.answers.length; j++) {
            const ans = question.answers[j];
            const ansText = question.options[ans-1];

            optionsWrapper.childNodes.forEach((option) => {
                if (option.innerText == ansText) {
                    showCorrectOption(option, j+1, ansText)
                    option.id = 'GF_click-'+j;
                    if (autoClick) option.click();
                    return;
                } 
            });
        }

    // TYPE : scrambled letters
    } else if (question.type == 'sl') {

        const optionsWrapper = qWrapper.getElementsByClassName('Question_type_scrambled-letters__unselected-box')[0];

        for (let j = 0; j < question.answers.length; j++) {
            const ans = question.answers[j];

            for (let k = 0; k < optionsWrapper.childNodes.length; k++) {
                const option = optionsWrapper.childNodes[k];
                if (option.innerText == ans) {
                    showCorrectOption(option, j+1, ansText)
                    option.id = 'GF_click-'+j;
                    if (autoClick) option.click();
                    break;
                } 
            }
        }

    // TYPE : mt
    } else if (question.type == 'mt' || question.type == 'tf') {

        const optionsWrapper = qWrapper.getElementsByClassName('Question__options')[0];

        for (let j = 0; j < question.answers.length; j++) {
            const ans = question.answers[j];
            const ansText = question.options[ans-1];

            optionsWrapper.childNodes.forEach((option) => {
                if (option.innerText == ansText) {
                    showCorrectOption(option, j+1, ansText)
                    option.id = 'GF_click-'+j;
                    if (autoClick) option.click();
                    return;
                } 
            });
        }

    // TYPE : short answer
    } else if (question.type == 'sa') {

        const input = document.querySelectorAll('textarea.Stem__answer_non-arabic')[0];
        input.value = question.answers[0];
        reactTriggerChange(input);

    } else {
        console.error(`Unkown question type : ${question.type}`);
    }
}



initBanner();

// Auto idle click
setInterval(() => {
    if (document.getElementsByClassName('idle-screen__continue')[0]) {
        console.log('Idle click');
        document.getElementsByClassName('idle-screen__continue')[0].click(); 
    }
}, 5000);

const delay = (time) =>  new Promise(resolve => setTimeout(resolve, time));
