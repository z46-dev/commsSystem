if (!localStorage.getItem("siteManagerPassword")) {
    localStorage.setItem("siteManagerPassword", prompt("Enter the site manager password"));
}

const response = await fetch("/api/data", {
    method: "POST",
    headers: {
        "Content-Type": "text/plain"
    },
    body: localStorage.getItem("siteManagerPassword")
});

if (response.status === 403) {
    alert("Invalid password");
    delete localStorage.siteManagerPassword;
    location.reload();
}

const data = await response.json();

console.log(data);

document.body.innerHTML = "";

function parseStringKey(key) {
    return key.split(/(?=[A-Z])/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

for (const key in data) {
    const section = document.createElement("div");
    section.classList.add("section");

    const header = document.createElement("h1");
    header.innerText = key;
    section.appendChild(header);

    if ("location" in data[key]) {
        const subSection = document.createElement("div");
        subSection.classList.add("subSection");

        const header = document.createElement("h3");
        header.innerText = "Location";
        subSection.appendChild(header);

        for (const $key in data[key].location) {
            const p = document.createElement("p");
            p.innerText = `${parseStringKey($key)}: ${data[key].location[$key]}`;
            subSection.appendChild(p);
        }

        section.appendChild(subSection);
    }

    if ("weather" in data[key]) {
        const subSection = document.createElement("div");
        subSection.classList.add("subSection");

        const header = document.createElement("h3");
        header.innerText = "Weather";
        subSection.appendChild(header);

        for (const $key in data[key].weather) {
            const p = document.createElement("p");
            p.innerText = `${parseStringKey($key)}: ${data[key].weather[$key]}`;
            subSection.appendChild(p);
        }

        section.appendChild(subSection);
    }

    if ("system" in data[key]) {
        const subSection = document.createElement("div");
        subSection.classList.add("subSection");

        const header = document.createElement("h2");
        header.innerText = "System";
        subSection.appendChild(header);

        for (const $key in data[key].system) {
            const subSubSection = document.createElement("div");
            subSubSection.classList.add("subSection");

            const header = document.createElement("h3");
            header.innerText = parseStringKey($key);
            subSubSection.appendChild(header);

            for (const $$key in data[key].system[$key]) {
                const p = document.createElement("p");
                p.innerText = `${parseStringKey($$key)}: ${data[key].system[$key][$$key]}`;
                subSubSection.appendChild(p);
            }

            subSection.appendChild(subSubSection);
        }

        section.appendChild(subSection);
    }

    document.body.appendChild(section);
}