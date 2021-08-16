import './App.scss';
import React, { useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Box, createTheme, Tab, Tabs, ThemeProvider } from '@material-ui/core';
import clsx from 'clsx';
import { Axis, Chart, Line, Point, Tooltip } from 'bizcharts';

const FIVE_DAYS = 0;
const ONE_MONTH = 1;
const SIX_MONTHS = 2;
const YTD = 3;
const ONE_YEAR = 4;
const FIVE_YEARS = 5;
const MAX = 6;

const priceHistoryCache = [];

const darkTheme = createTheme({
    palette: {
        type: 'dark'
    },
    overrides: {
        MuiTabs: {
            indicator: {
                backgroundColor: '#6494f4'
            }
        },
        MuiTab: {
            textColorPrimary: {
                fontWeight: 'bold',
                fontFamily: 'Montserrat, sans-serif',
                '&$selected': {
                    color: '#6494f4'
                }
            }
        }
    }
});

const useStyles = makeStyles(theme => ({
    title: {
        margin: theme.spacing(2, 0),
        letterSpacing: '0.5rem',
        fontSize: '1rem'
    },
    subtitle: {
        margin: theme.spacing(0, 0, 2),
        fontSize: '5rem'
    },
    chart: {
        margin: theme.spacing(0, 0, 2),
        padding: theme.spacing(1)
    },
    tab: {
        minWidth: 120
    }
}));

function App() {
    const classes = useStyles();

    const [currentPrice, setCurrentPrice] = useState('$');
    const [priceHistory, setPriceHistory] = useState([]);
    const [tabIndex, setTabIndex] = useState(0);
    const [animate, setAnimate] = useState(false);

    const formattedDate = timestamp =>
        (timestamp ? new Date(timestamp) : new Date()).toJSON().slice(0, 10);

    const loadCurrentPrice = async () => {
        const data = await fetch(
            `https://api.coindesk.com/v1/bpi/currentprice/USD.json`
        ).then(res => res.json());

        const { rate } = data.bpi.USD;
        const rounded = parseFloat(rate.replace(/,/g, ''))
            .toFixed(2)
            .replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
        const newPrice = '$' + rounded;

        if (newPrice !== currentPrice) return setCurrentPrice(newPrice);

        // Update price every 30 seconds, if current price gets set then the useEffect will do this instead
        setTimeout(loadCurrentPrice, 30000);
    };

    const loadPriceHistory = async () => {
        if (priceHistoryCache[tabIndex])
            return setPriceHistory(priceHistoryCache[tabIndex]);

        let startDate;
        if (tabIndex === MAX) {
            startDate = '2010-07-17';
        } else if (tabIndex === YTD) {
            startDate = new Date(Date.now()).getFullYear() + '-01-01';
        } else {
            let days;
            switch (tabIndex) {
                case FIVE_DAYS:
                    days = 5;
                    break;
                case ONE_MONTH:
                    days = 30;
                    break;
                case SIX_MONTHS:
                    days = 6 * 30;
                    break;
                case ONE_YEAR:
                    days = 365;
                    break;
                case FIVE_YEARS:
                    days = 5 * 365;
                    break;
                default:
                    days = 5;
                    break;
            }
            startDate = formattedDate(Date.now() - days * 24 * 60 * 60 * 1000);
        }

        const data = await fetch(
            `https://api.coindesk.com/v1/bpi/historical/close.json?start=${startDate}&end=${formattedDate(
                Date.now()
            )}`
        ).then(res => res.json());

        const { bpi } = data;

        // Process incoming data format to chart format
        let history = Object.entries(bpi).map(([key, val]) => ({
            date: key,
            price: val
        }));

        // UI can't keep up with thousands of data points, limit it to 500 points
        if (history.length > 500)
            history = history.filter(
                (val, i) => !(i % Math.ceil(history.length / 500))
            );
        setPriceHistory(history);
        priceHistoryCache[tabIndex] = history;
    };

    const handleTabClick = (event, newValue) => {
        setTabIndex(newValue);
    };

    useEffect(() => {
        loadCurrentPrice();
        loadPriceHistory();
    }, []);

    useEffect(() => {
        loadPriceHistory();
    }, [tabIndex]);

    useEffect(() => {
        setAnimate(true);
        setTimeout(() => setAnimate(false), 1000);

        // Update price every 30 seconds
        setTimeout(loadCurrentPrice, 30000);
    }, [currentPrice]);

    return (
        <ThemeProvider theme={darkTheme}>
            <Box display="flex" justifyContent="center" flexDirection="column">
                <div
                    className={clsx(classes.title, 'glitch')}
                    data-text={'btc-price'}
                >
                    btc-price
                </div>
                <div
                    className={clsx(
                        classes.subtitle,
                        animate ? 'glitch' : null
                    )}
                    data-text={currentPrice}
                >
                    {currentPrice}
                </div>
                <Tabs
                    value={tabIndex}
                    onChange={handleTabClick}
                    indicatorColor="primary"
                    textColor="primary"
                    centered
                >
                    <Tab className={classes.tab} label="5 days" />
                    <Tab className={classes.tab} label="1 month" />
                    <Tab className={classes.tab} label="6 months" />
                    <Tab className={classes.tab} label="YTD" />
                    <Tab className={classes.tab} label="1 year" />
                    <Tab className={classes.tab} label="5 years" />
                    <Tab className={classes.tab} label="Max" />
                </Tabs>
                <Chart
                    className={classes.chart}
                    appendPadding={[0, 0, 0, 0]}
                    autoFit
                    height={500}
                    data={priceHistory}
                    scale={{
                        price: {
                            alias: 'Price (USD)',
                            type: 'linear-strict'
                        }
                    }}
                >
                    <Axis
                        name="price"
                        label={{
                            formatter: val =>
                                `$${val.replace(
                                    /(\d)(?=(\d{3})+(?!\d))/g,
                                    '$1,'
                                )}`
                        }}
                    />
                    <Line position="date*price" />
                    <Point position="date*price" />
                    <Tooltip showCrosshairs />
                </Chart>
                <div>
                    Powered by{' '}
                    <a href="https://www.coindesk.com/price/bitcoin">
                        CoinDesk
                    </a>
                </div>
            </Box>
        </ThemeProvider>
    );
}

export default App;
