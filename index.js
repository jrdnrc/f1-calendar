const Alexa = require('alexa-sdk')
const sprintf = require('sprintf').sprintf
const vsprintf = require('sprintf').vsprintf
const request = require('request')
const moment = require('moment')

const languageStrings = {
    'en': {
        translation: {
            'SKILL_NAME': 'Formula One Calendar',
            'HELP_MESSAGE': 'You can ask when the next Grand Prix is',
            'STOP_MESSAGE': 'Goodbye!',
            'NEXT_GRAND_PRIX': 'The next Formula One Grand Prix is on the %s in %s',
            'TOP_DRIVERS': 'The top three drivers are %s, %s and %s',
            'API_FAILURE': 'I\'m sorry, I wasn\'t able to get that information in my allowed time'
        }
    }
}

const handlers = {
    LaunchRequest() {
        this.emit('FindNextGrandPrix')
    },
    FindNextGrandPrix() {
        request.get('https://ergast.com/api/f1/current/next.json', (err, res, body) => {
            if (err) {
                switch (err.code) {
                    case 'ETIMEDOUT':
                        this.emit(':tell', this.t('API_FAILURE'))
                        break
                }

                return
            }

            const race = JSON.parse(body).MRData.RaceTable.Races.pop()

            this.emit(
                ':tell',
                sprintf(
                    this.t('NEXT_GRAND_PRIX'),
                    moment(race.date).format('Do of MMMM'),
                    race.Circuit.Location.country
                ),
                this.t('SKILL_NAME')
            )
        })
    },
    GetTopThree() {
        request.get('https://ergast.com/api/f1/current/driverStandings.json', (err, res, body) => {
            if (err) {
                switch (err.code) {
                    case 'ETIMEDOUT':
                        this.emit(':tell', this.t('API_FAILURE'))
                        break
                }

                return
            }

            const drivers = JSON
                .parse(body)
                .MRData
                .StandingsTable
                .StandingsLists[0]
                .DriverStandings
                .slice(0, 3)
                .map(driver => `${driver.Driver.givenName} ${driver.Driver.familyName} with ${driver.points} points`)

            this.emit(':tell', vsprintf(this.t('TOP_DRIVERS'), drivers))
        })
    },
    'AMAZON.HelpIntent':   function () {
        const speechOutput = this.t('HELP_MESSAGE')
        const reprompt     = this.t('HELP_MESSAGE')

        this.emit(':ask', speechOutput, reprompt)
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', this.t('STOP_MESSAGE'))
    },
    'AMAZON.StopIntent':   function () {
        this.emit(':tell', this.t('STOP_MESSAGE'))
    }
}

exports.handler = function (event, context) {
    const alexa = Alexa.handler(event, context)

    alexa.appId  = process.env.APP_ID
    alexa.resources = languageStrings
    alexa.registerHandlers(handlers)
    alexa.execute()
}