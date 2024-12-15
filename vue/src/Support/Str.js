let self = {
    urlencode(str) {
        return encodeURIComponent(str);
    },

    slug(str) {
        str = str.replace(/^\s+|\s+$/g, ''); // trim
        str = str.toLowerCase();

        // remove accents, swap ñ for n, etc
        var from = "àáãäâèéëêìíïîòóöôùúüûñç·/_,:;";
        var to   = "aaaaaeeeeiiiioooouuuunc------";

        for (var i=0, l=from.length ; i<l ; i++) {
            str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
        }

        str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
            .replace(/\s+/g, '-') // collapse whitespace and replace by -
            .replace(/-+/g, '-'); // collapse dashes

        return str;
    },

    dashcase(str) {
        return str.split('').map((letter, idx) => {
            return letter.toUpperCase() === letter
            ? `${idx !== 0 ? '-' : ''}${letter.toLowerCase()}`
            : letter;
        }).join('');
    },

    camelcase(str) {
        return str.replace(/-/g, ' ').replace(/_/g, ' ').replace(/(^([a-zA-Z\p{M}]))|([ -][a-zA-Z\p{M}])/g,function(s) {
            return s.toUpperCase();
        }).replace(/\s+/g, '');
    },

    camel2space(str) {
        if ( !str ) {
            return '';
        }

        return str.split('').map((letter, idx) => {
            return letter.toUpperCase() === letter
            ? `${idx !== 0 ? ' ' : ''}${letter}`
            : letter;
        }).join('');
    },

    ucfirst(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },

    ucwords(str) {
        if ( !str ) {
            str = '';
        }

        //ensure string
        str = str + '';

        return str.replace(/-/g, ' ').replace(/_/g, ' ').replace(/(^([a-zA-Z\p{M}]))|([ -][a-zA-Z\p{M}])/g,function(s) {
            return s.toUpperCase();
        });
    },

    ordinalSuffix(i) {
        var j = i % 10,
            k = i % 100;
        if (j == 1 && k != 11) {
            return i + "st";
        }
        if (j == 2 && k != 12) {
            return i + "nd";
        }
        if (j == 3 && k != 13) {
            return i + "rd";
        }

        return i + "th";
    },

    string_to_date(str) {
        let match;
        let months_short = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

        //trim spaces
        str = str.trim();

        //dash format: 23-10-2024
        match = str.match(/(\d{2})-(\d{2})-(\d{4})/);
        if ( match && match.length == 4 ) {
            return new Date(`${match[3]}-${match[2]}-${match[1]}`);
        }

        //dot format: 23.10.2024
        match = str.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        if ( match && match.length == 4 ) {
            return new Date(`${match[3]}-${match[2]}-${match[1]}`);
        }

        //pretty format: 23 Oct
        match = str.match(/(\d{2}) (\w{3})/i);
        if ( match && match.length == 3 ) {
            let date = new Date();
            let month = months_short.indexOf(match[2].toLowerCase()) + 1;
            return new Date(`${date.getFullYear()}-${self.leading_zero(month)}-${match[1]}`);
        }

        //pretty format with year: 23 Oct 2024
        match = str.match(/(\d{2}) (\w{3}) (\d{4})/i);
        if ( match && match.length == 4 ) {
            let month = months_short.indexOf(months_short[match[2].toLowerCase()]) + 1;
            return new Date(`${match[3]}-${self.leading_zero(month)}-${match[1]}`);
        }

        //today
        if ( str.match(/^today$/i) ) {
            return new Date();
        }

        //yesterday
        if ( str.match(/^yesterday$/i) ) {
            let date = new Date();
            return date.setDate(date.getDate() - 1);
        }

        return new Date(str);
    },

    prettify_date(date) {
        if ( !date ) {
            return 'Never';
        }

        let mysql_date = date;
        if ( typeof date == 'string' ) {
            date = new Date(date);
        }
        else {
            mysql_date = self.mysql_date(date);
        }

        if ( isNaN(date) ) {
            return 'Invalid Date';
        }

        //check if is today
        let today = new Date();
        if ( self.mysql_date(today) == mysql_date ) {
            return 'Today';
        }

        //check if is yesterday
        today.setDate(-1);
        if ( self.mysql_date(today) == mysql_date ) {
            return 'Yesterday';
        }

        //check if is current year then don't display it
        if ( new Date(date).getFullYear() == today.getFullYear() ) {
            return `${self.leading_zero(date.getDate())} ${date.toLocaleString('default', { month: 'short' })}`;
        }

        return `${self.leading_zero(date.getDate())} ${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
    },

    prettify_datetime(date) {
        const options = {};
        const parsed_date = new Date(new Date(date + 'Z').toLocaleString('en-US', options)); // Add 'Z' for UTC handling
        const now = new Date();

        if (parsed_date.getFullYear() === now.getFullYear()) {
            return parsed_date.toLocaleDateString('en-US', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            }).replace(',', ' @');
        }

        return parsed_date.toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).replace(',', ' @');
    },

    prettify_time(date) {
        const options = {};
        const parsed_date = new Date(new Date(date + 'Z').toLocaleString('en-US', options)); // Add 'Z' for UTC handling

        return parsed_date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    },

    mysql_date(date = null) {
        if ( !date ) {
            date = new Date();
        }

        let month = date.getMonth() + 1;
        let day = date.getDate();
        return `${date.getFullYear()}-${self.leading_zero(month)}-${self.leading_zero(day)}`;
    },

    number_to_month(number) {
        let months = {
            1: 'January',
            2: 'February',
            3: 'March',
            4: 'April',
            5: 'May',
            6: 'June',
            7: 'July',
            8: 'August',
            9: 'September',
            10: 'October',
            11: 'November',
            12: 'December',
        };

        return months[`${number}`.replace(/^0/, '')];
    },

    nl2br(str) {
        if ( !str || !str.length ) {
            return '';
        }

        return str.replace(/(\r\n|\n\r|\r|\n)/g, '<br/>' + '$1');
    },

    strip_tags(str) {
        var div = document.createElement("div");
        div.innerHTML = str;
        var text = div.textContent || div.innerText || "";
        return text;
    },

    ensure_https(string) {
        if (!string.match(/^[a-zA-Z]+:\/\//)) {
            string = 'https://' + string;
        }

        return string;
    },

    add_commas(number) {
        if ( number === undefined || number === null ) {
            return '';
        }

        number = parseFloat(number).toFixed(2).toLocaleString('en-US');

        if ( Auth.user.team.meta.number_format_with_space ) {
            number = number.replace(/,/g, ' ');
        }

        return number;
    },

    add_commas2(number) {
        if ( number === undefined || number === null ) {
            return '';
        }

        number = parseFloat(parseFloat(number).toFixed(2)).toLocaleString('en-US');
        number = number.replace(/,/g, ' ');

        return number;
    },

    leading_zero(number) {
        return number < 10 ? `0${number}` : number;
    },

    to_percetange(number) {
        if ( number === undefined || !number ) {
            return '0%';
        }

        return (number / 10)+'%';
    },

    plural(str) {
        str = self.ucwords(str);

        if ( str.match(/y$/) ) {
            return str.replace(/y$/, 'ies');
        }

        return str+'s';
    },
}

export default self;
